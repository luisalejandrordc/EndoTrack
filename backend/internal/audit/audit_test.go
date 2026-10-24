package audit

import (
	"context"
	"endosoflow/internal/platform/apperr"
	"endosoflow/internal/platform/database"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
)

// Needs a migrated database: run `make db-verify` once, then `make test`.
func TestRecordWritesAnEventAndTheDatabaseEnforcesReasons(t *testing.T) {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL is not set")
	}
	ctx := context.Background()
	pool, err := database.Connect(ctx, dsn)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	defer pool.Close()

	entity := uuid.New()
	now := time.Now()

	// A system event with a change summary.
	if err := Record(ctx, pool, Event{
		EntityType: EntityEmployee, EntityID: entity, Action: ActionCreated,
		Changes: map[string]any{"role": "sales_advisor"},
	}, now); err != nil {
		t.Fatalf("record: %v", err)
	}
	var kind string
	var summary string
	err = pool.QueryRow(ctx, `SELECT actor_kind::text, changes_summary::text FROM audit_logs WHERE entity_id = $1`, entity).
		Scan(&kind, &summary)
	if err != nil || kind != "system" || summary == "" {
		t.Fatalf("unexpected row: kind=%q summary=%q err=%v", kind, summary, err)
	}

	// DELETED without a reason is refused by the database, and the error maps to REASON_REQUIRED.
	err = Record(ctx, pool, Event{EntityType: EntityEmployee, EntityID: uuid.New(), Action: ActionDeleted}, now)
	var appErr *apperr.Error
	if err == nil || !errors.As(apperr.FromError(err), &appErr) || appErr.Code != "REASON_REQUIRED" {
		t.Fatalf("expected REASON_REQUIRED, got %v", err)
	}
}
