package customers

import (
	"context"
	"endosoflow/internal/adapters/codart"
	"endosoflow/internal/auth"
	"endosoflow/internal/platform/apperr"
	"endosoflow/internal/platform/database"
	"endosoflow/internal/platform/ids"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

// IdentityProvider looks up names for a DNI or RUC (implemented by the Codart client). Tests use a fake.
type IdentityProvider interface {
	LookupDNI(ctx context.Context, dni string) (codart.Person, error)
	LookupRUC(ctx context.Context, ruc string) (string, error)
}

// providerTimeout bounds one call so a slow provider cannot hold a request open.
const providerTimeout = 8 * time.Second

// limaZone is fixed because Peru has no daylight saving time.
var limaZone = time.FixedZone("America/Lima", -5*60*60)

// quotaPeriod returns the Lima calendar month that contains now.
func quotaPeriod(now time.Time) (time.Time, time.Time) {
	local := now.In(limaZone)
	start := time.Date(local.Year(), local.Month(), 1, 0, 0, 0, 0, limaZone)
	return start, start.AddDate(0, 1, 0)
}

var (
	errLookupUnavailable = apperr.New(503, "LOOKUP_UNAVAILABLE",
		"La consulta automática no está disponible. Ingrese los datos manualmente.")
	errLookupQuotaExhausted = apperr.Conflict("LOOKUP_QUOTA_EXHAUSTED",
		"Se agotó el cupo mensual de consultas automáticas. Ingrese los datos manualmente.")
	errIdentityNotFound = apperr.NotFound("IDENTITY_NOT_FOUND",
		"No se encontró el documento. Ingrese los datos manualmente.")
	errLookupNotSupported = apperr.Unprocessable("LOOKUP_NOT_SUPPORTED",
		"Solo se consultan DNI y RUC. Ingrese los datos manualmente.")
)

// LookupIdentity fills a name from a DNI or RUC. It protects the monthly Codart allowance: our own
// database is checked first (a known customer costs no call), each employee has a per-minute limit, and
// the monthly counter is checked and reserved atomically before the provider is called. Every attempt is
// logged. When it fails, the caller shows manual entry.
func (s *Service) LookupIdentity(ctx context.Context, actor auth.Actor, docType, docNumber string) (*IdentityResult, error) {
	if err := requireStaff(actor); err != nil {
		return nil, err
	}
	docType, docNumber, valid := normalizeDocument(docType, docNumber)
	var kind string
	switch docType {
	case "DNI":
		kind = "codart_dni"
	case "RUC":
		kind = "codart_ruc"
	default:
		return nil, errLookupNotSupported
	}
	if !valid {
		return nil, errInvalidDocument
	}
	now := s.now()

	// 1. A customer we already have costs nothing.
	existing, err := findByDocument(ctx, s.db, docType, docNumber)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		if err := insertLookupLog(ctx, s.db, ids.New(), actor.ID, "customer_existence", docType, docNumber, "success", now); err != nil {
			return nil, err
		}
		return &IdentityResult{
			DocumentType: docType, DocumentNumber: docNumber, Source: "database",
			FirstName: existing.FirstName, LastName: existing.LastName, LegalName: existing.LegalName,
		}, nil
	}

	if s.identity == nil {
		return nil, errLookupUnavailable
	}

	// 2. Rate limit, then reserve one unit of the monthly quota. The advisory lock makes the check and the
	// reservation one step, so two simultaneous requests cannot both take the last unit. The reservation
	// is a log row marked "error" until the real outcome is known; if the process dies mid-call it stays
	// counted, which errs on the safe side.
	logID := ids.New()
	var refusal error
	err = database.WithTx(ctx, s.db, func(tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `SELECT pg_advisory_xact_lock(hashtext('codart_quota'))`); err != nil {
			return err
		}
		recent, err := countRecentLookups(ctx, tx, actor.ID, []string{"codart_dni", "codart_ruc"}, now.Add(-time.Minute))
		if err != nil {
			return err
		}
		if recent >= s.lookupsPerMinute {
			refusal = apperr.TooManyRequests("RATE_LIMITED", "Demasiadas consultas seguidas. Espere un momento e intente nuevamente.")
			return insertLookupLog(ctx, tx, logID, actor.ID, kind, docType, docNumber, "rate_limited", now)
		}
		from, to := quotaPeriod(now)
		used, err := countProviderCalls(ctx, tx, from, to)
		if err != nil {
			return err
		}
		if used >= s.monthlyQuota {
			refusal = errLookupQuotaExhausted
			return insertLookupLog(ctx, tx, logID, actor.ID, kind, docType, docNumber, "quota_blocked", now)
		}
		return insertLookupLog(ctx, tx, logID, actor.ID, kind, docType, docNumber, "error", now)
	})
	if err != nil {
		return nil, apperr.FromError(err)
	}
	if refusal != nil {
		return nil, refusal
	}

	// 3. Call the provider.
	callCtx, cancel := context.WithTimeout(ctx, providerTimeout)
	defer cancel()
	result := &IdentityResult{DocumentType: docType, DocumentNumber: docNumber, Source: "provider"}
	var callErr error
	if docType == "DNI" {
		var person codart.Person
		person, callErr = s.identity.LookupDNI(callCtx, docNumber)
		if callErr == nil {
			result.FirstName, result.LastName = &person.FirstName, &person.LastName
		}
	} else {
		var name string
		name, callErr = s.identity.LookupRUC(callCtx, docNumber)
		if callErr == nil {
			result.LegalName = &name
		}
	}

	outcome := "success"
	switch {
	case callErr == nil:
	case errors.Is(callErr, codart.ErrNotFound):
		outcome = "not_found"
	default:
		outcome = "error"
		s.logger.Warn("identity lookup failed", "kind", kind, "error", callErr)
	}
	// The outcome is written even if the request was cancelled meanwhile.
	if err := setLookupOutcome(context.WithoutCancel(ctx), s.db, logID, outcome); err != nil {
		s.logger.Error("could not record the lookup outcome", "log_id", logID, "error", err)
	}

	switch outcome {
	case "success":
		return result, nil
	case "not_found":
		return nil, errIdentityNotFound
	default:
		return nil, errLookupUnavailable
	}
}

// IdentityQuota reports the Codart usage this month. Admin only.
func (s *Service) IdentityQuota(ctx context.Context, actor auth.Actor) (*QuotaStatus, error) {
	if err := requireAdmin(actor); err != nil {
		return nil, err
	}
	from, to := quotaPeriod(s.now())
	used, err := countProviderCalls(ctx, s.db, from, to)
	if err != nil {
		return nil, err
	}
	remaining := s.monthlyQuota - used
	if remaining < 0 {
		remaining = 0
	}
	return &QuotaStatus{Limit: s.monthlyQuota, Used: used, Remaining: remaining, PeriodStart: from.UTC(), PeriodEnd: to.UTC()}, nil
}
