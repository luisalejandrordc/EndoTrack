package apperr

import (
	"errors"
	"fmt"
	"net/http"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"
)

func TestFromErrorMapsPostgresErrors(t *testing.T) {
	tests := []struct {
		name       string
		pg         *pgconn.PgError
		wantCode   string
		wantStatus int
	}{
		{"duplicate VIN", &pgconn.PgError{Code: "23505", ConstraintName: "ux_sale_registers_vin"}, "VIN_ALREADY_USED", http.StatusConflict},
		{"duplicate invoice, Toyota namespace", &pgconn.PgError{Code: "23505", ConstraintName: "ux_sale_invoices_number_toyota"}, "INVOICE_NUMBER_ALREADY_USED", http.StatusConflict},
		{"duplicate invoice, Grupo Pana namespace", &pgconn.PgError{Code: "23505", ConstraintName: "ux_sale_invoices_number_pana"}, "INVOICE_NUMBER_ALREADY_USED", http.StatusConflict},
		{"second task in progress", &pgconn.PgError{Code: "23505", ConstraintName: "ux_task_instances_one_in_progress"}, "TASK_ALREADY_IN_PROGRESS", http.StatusConflict},
		{"unknown unique constraint", &pgconn.PgError{Code: "23505", ConstraintName: "something_new"}, "ALREADY_EXISTS", http.StatusConflict},
		{"missing mismatch reason", &pgconn.PgError{Code: "23514", ConstraintName: "sale_payments_mismatch_reason"}, "MISMATCH_REASON_REQUIRED", http.StatusUnprocessableEntity},
		{"commission not positive", &pgconn.PgError{Code: "23514", ConstraintName: "sale_financials_commission_positive"}, "COMMISSION_NOT_POSITIVE", http.StatusUnprocessableEntity},
		{"unknown check constraint", &pgconn.PgError{Code: "23514", ConstraintName: "something_new"}, "CHECK_VIOLATION", http.StatusUnprocessableEntity},
		{"color from another model", &pgconn.PgError{Code: "23503", ConstraintName: "sale_registers_color_model_fk"}, "VEHICLE_MODEL_MISMATCH", http.StatusUnprocessableEntity},
		{"generic foreign key", &pgconn.PgError{Code: "23503", ConstraintName: "something_new"}, "REFERENCE_VIOLATION", http.StatusConflict},
		{"deadlock", &pgconn.PgError{Code: "40P01"}, "CONCURRENT_UPDATE", http.StatusConflict},
		{"immutable column", &pgconn.PgError{Code: "EF001"}, "IMMUTABLE_FIELD", http.StatusConflict},
		{"task sequence", &pgconn.PgError{Code: "EF002"}, "TASK_SEQUENCE_VIOLATION", http.StatusConflict},
		{"catalog incomplete", &pgconn.PgError{Code: "EF005"}, "CATALOG_INCOMPLETE", http.StatusUnprocessableEntity},
		{"last admin", &pgconn.PgError{Code: "EF006"}, "LAST_ADMIN_PROTECTED", http.StatusConflict},
		{"programming mistake: sale children", &pgconn.PgError{Code: "EF003"}, "INTERNAL_ERROR", http.StatusInternalServerError},
		{"programming mistake: append-only", &pgconn.PgError{Code: "EF004"}, "INTERNAL_ERROR", http.StatusInternalServerError},
		{"unmapped SQLSTATE", &pgconn.PgError{Code: "XX000"}, "INTERNAL_ERROR", http.StatusInternalServerError},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Errors usually arrive wrapped, so wrap on purpose.
			got := FromError(fmt.Errorf("saving the sale: %w", tc.pg))
			if got.Code != tc.wantCode || got.Status != tc.wantStatus {
				t.Fatalf("got %s/%d, want %s/%d", got.Code, got.Status, tc.wantCode, tc.wantStatus)
			}
			if got.Message == "" {
				t.Fatal("the client message must not be empty")
			}
			if !errors.Is(got, tc.pg) {
				t.Fatal("the underlying cause must be kept for the logs")
			}
		})
	}
}

func TestFromErrorPassesTypedErrorsThrough(t *testing.T) {
	original := NotFound("SALE_NOT_FOUND", "La venta no existe.")
	got := FromError(fmt.Errorf("loading: %w", original))
	if got != original {
		t.Fatal("a typed error must come back unchanged")
	}
}

func TestFromErrorFallsBackToInternal(t *testing.T) {
	got := FromError(errors.New("disk on fire"))
	if got.Code != "INTERNAL_ERROR" || got.Status != http.StatusInternalServerError {
		t.Fatalf("got %s/%d", got.Code, got.Status)
	}
	if got.Message == "disk on fire" {
		t.Fatal("internal details must never reach the client")
	}
}

func TestFromErrorNil(t *testing.T) {
	if FromError(nil) != nil {
		t.Fatal("nil must stay nil")
	}
}

func TestWithFieldsDoesNotMutateTheOriginal(t *testing.T) {
	base := Unprocessable("VALIDATION_FAILED", "Datos inválidos.")
	withField := base.WithFields(FieldError{Field: "vin", Code: "VIN_INVALID", Message: "VIN inválido."})
	if len(base.Fields) != 0 || len(withField.Fields) != 1 {
		t.Fatalf("base has %d fields, copy has %d", len(base.Fields), len(withField.Fields))
	}
}
