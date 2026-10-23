// Package apperr defines the application's error type and maps database errors to it.
//
// Every error that reaches an HTTP client is an *Error with a stable English code, an HTTP status
// and a Spanish message that is safe to show. The underlying cause is logged, never sent.
package apperr

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/jackc/pgx/v5/pgconn"
)

// FieldError describes a problem with one input field.
type FieldError struct {
	Field   string `json:"field"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

// Error is an error that carries its code, HTTP status and client-safe message.
type Error struct {
	Code    string
	Status  int
	Message string
	Fields  []FieldError
	Err     error // underlying cause: logged, never shown to the client
}

func (e *Error) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Code, e.Err)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

func (e *Error) Unwrap() error { return e.Err }

// WithFields returns a copy of the error with field-level details added.
func (e *Error) WithFields(fields ...FieldError) *Error {
	clone := *e
	clone.Fields = append(append([]FieldError(nil), e.Fields...), fields...)
	return &clone
}

// WithCause returns a copy of the error that remembers the underlying cause for the logs.
func (e *Error) WithCause(err error) *Error {
	clone := *e
	clone.Err = err
	return &clone
}

// New builds an error with an explicit status.
func New(status int, code, message string) *Error {
	return &Error{Code: code, Status: status, Message: message}
}

func BadRequest(code, message string) *Error      { return New(http.StatusBadRequest, code, message) }
func Unauthorized(code, message string) *Error    { return New(http.StatusUnauthorized, code, message) }
func Forbidden(code, message string) *Error       { return New(http.StatusForbidden, code, message) }
func NotFound(code, message string) *Error        { return New(http.StatusNotFound, code, message) }
func Conflict(code, message string) *Error        { return New(http.StatusConflict, code, message) }
func Unprocessable(code, message string) *Error   { return New(http.StatusUnprocessableEntity, code, message) }
func TooManyRequests(code, message string) *Error { return New(http.StatusTooManyRequests, code, message) }

// Internal wraps an unexpected failure. The client only sees a generic message.
func Internal(cause error) *Error {
	return &Error{
		Code:    "INTERNAL_ERROR",
		Status:  http.StatusInternalServerError,
		Message: "Ocurrió un error inesperado. Intente nuevamente.",
		Err:     cause,
	}
}

// FromError converts any error into an *Error. Typed errors pass through, PostgreSQL errors are
// mapped by their constraint or SQLSTATE, and anything else becomes an internal error.
func FromError(err error) *Error {
	if err == nil {
		return nil
	}
	var typed *Error
	if errors.As(err, &typed) {
		return typed
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		return fromPostgres(pgErr, err)
	}
	return Internal(err)
}

type rule struct {
	status  int
	code    string
	message string
}

// Constraint names come from the migrations; renaming one there means renaming it here.
var uniqueRules = map[string]rule{
	"ux_sale_registers_series":          {http.StatusConflict, "SERIES_ALREADY_USED", "El número de serie ya está registrado en otra venta activa o completada."},
	"ux_sale_registers_vin":             {http.StatusConflict, "VIN_ALREADY_USED", "El VIN ya está registrado en otra venta activa o completada."},
	"ux_sale_registers_plate":           {http.StatusConflict, "PLATE_ALREADY_USED", "La placa ya está registrada en otra venta activa o completada."},
	"ux_sale_invoices_number_toyota":    {http.StatusConflict, "INVOICE_NUMBER_ALREADY_USED", "El número de factura ya está registrado."},
	"ux_sale_invoices_number_pana":      {http.StatusConflict, "INVOICE_NUMBER_ALREADY_USED", "El número de factura ya está registrado."},
	"sale_invoices_sale_kind_unique":    {http.StatusConflict, "INVOICE_KIND_ALREADY_EXISTS", "La venta ya tiene una factura de ese tipo."},
	"sale_payments_transaction_unique":  {http.StatusConflict, "TRANSACTION_ALREADY_USED", "El número de operación ya está registrado para ese banco."},
	"sale_payments_sale_kind_unique":    {http.StatusConflict, "PAYMENT_ALREADY_EXISTS", "La venta ya tiene un pago de ese tipo."},
	"ux_sale_fulfillment_dam":           {http.StatusConflict, "DAM_ALREADY_USED", "El número de DAM ya está registrado en otra venta."},
	"customers_document_unique":         {http.StatusConflict, "CUSTOMER_ALREADY_EXISTS", "Ya existe un cliente con ese documento."},
	"employees_document_unique":         {http.StatusConflict, "EMPLOYEE_ALREADY_EXISTS", "Ya existe un empleado con ese documento."},
	"ux_employees_business_email":       {http.StatusConflict, "EMPLOYEE_EMAIL_ALREADY_USED", "Ya existe un empleado con ese correo corporativo."},
	"ux_task_instances_one_in_progress": {http.StatusConflict, "TASK_ALREADY_IN_PROGRESS", "La venta ya tiene una tarea en curso."},
	"documents_slot_unique":             {http.StatusConflict, "DOCUMENT_SLOT_OCCUPIED", "Ese espacio de documento ya tiene un archivo."},
	"ux_vehicle_models_name":            {http.StatusConflict, "MODEL_NAME_ALREADY_USED", "Ya existe un modelo con ese nombre."},
	"ux_vehicle_versions_name":          {http.StatusConflict, "VERSION_NAME_ALREADY_USED", "Ya existe una versión con ese nombre en el modelo."},
	"ux_vehicle_colors_name":            {http.StatusConflict, "COLOR_NAME_ALREADY_USED", "Ya existe un color con ese nombre en el modelo."},
	"ux_account_tokens_open_employee":   {http.StatusConflict, "ACTIVATION_LINK_ALREADY_OPEN", "Ya existe un enlace vigente para esta cuenta."},
	"ux_account_tokens_open_customer":   {http.StatusConflict, "ACTIVATION_LINK_ALREADY_OPEN", "Ya existe un enlace vigente para esta cuenta."},
}

var checkRules = map[string]rule{
	"sale_payments_mismatch_reason":      {http.StatusUnprocessableEntity, "MISMATCH_REASON_REQUIRED", "El monto no coincide con el esperado: escriba el motivo de la diferencia."},
	"sale_invoices_mismatch_reason":      {http.StatusUnprocessableEntity, "MISMATCH_REASON_REQUIRED", "El monto no coincide con el esperado: escriba el motivo de la diferencia."},
	"sale_financials_commission_positive": {http.StatusUnprocessableEntity, "COMMISSION_NOT_POSITIVE", "La comisión final debe ser mayor que cero."},
	"sale_registers_vin_format":          {http.StatusUnprocessableEntity, "VIN_INVALID", "El VIN debe tener 17 caracteres y no puede incluir las letras I, O ni Q."},
	"sale_registers_plate_format":        {http.StatusUnprocessableEntity, "PLATE_INVALID", "La placa debe tener 6 caracteres alfanuméricos."},
	"sale_invoices_number_format":        {http.StatusUnprocessableEntity, "INVOICE_NUMBER_INVALID", "El número de factura debe tener serie de 4 caracteres, un guion y el correlativo."},
	"customers_document_format":          {http.StatusUnprocessableEntity, "DOCUMENT_NUMBER_INVALID", "El número de documento no tiene el formato válido para su tipo."},
	"employees_document_format":          {http.StatusUnprocessableEntity, "DOCUMENT_NUMBER_INVALID", "El número de documento no tiene el formato válido para su tipo."},
	"sale_due_diligence_signer_format":   {http.StatusUnprocessableEntity, "DOCUMENT_NUMBER_INVALID", "El número de documento no tiene el formato válido para su tipo."},
	"audit_logs_reason_required":           {http.StatusUnprocessableEntity, "REASON_REQUIRED", "Debe escribir el motivo de esta acción."},
	"sale_registers_other_needs_text":    {http.StatusUnprocessableEntity, "CANCELLATION_TEXT_REQUIRED", "Con el motivo \u201cOtro\u201d debe escribir una explicación."},
}

var foreignKeyRules = map[string]rule{
	"sale_registers_version_model_fk": {http.StatusUnprocessableEntity, "VEHICLE_MODEL_MISMATCH", "La versión y el color deben pertenecer al modelo seleccionado."},
	"sale_registers_color_model_fk":   {http.StatusUnprocessableEntity, "VEHICLE_MODEL_MISMATCH", "La versión y el color deben pertenecer al modelo seleccionado."},
	"documents_task_sale_fk":          {http.StatusUnprocessableEntity, "DOCUMENT_TASK_MISMATCH", "El archivo no corresponde a una tarea de esta venta."},
}

func fromPostgres(pgErr *pgconn.PgError, cause error) *Error {
	var r rule
	switch pgErr.Code {
	case "23505": // unique_violation
		found, ok := uniqueRules[pgErr.ConstraintName]
		if !ok {
			found = rule{http.StatusConflict, "ALREADY_EXISTS", "Ya existe un registro con esos datos."}
		}
		r = found
	case "23514": // check_violation
		found, ok := checkRules[pgErr.ConstraintName]
		if !ok {
			found = rule{http.StatusUnprocessableEntity, "CHECK_VIOLATION", "Los datos no cumplen una regla de validación."}
		}
		r = found
	case "23503": // foreign_key_violation
		found, ok := foreignKeyRules[pgErr.ConstraintName]
		if !ok {
			found = rule{http.StatusConflict, "REFERENCE_VIOLATION", "El registro está relacionado con otros datos o la referencia no existe."}
		}
		r = found
	case "40001", "40P01": // serialization_failure, deadlock_detected
		r = rule{http.StatusConflict, "CONCURRENT_UPDATE", "Otro usuario modificó este registro. Recargue e intente nuevamente."}
	case "EF001":
		r = rule{http.StatusConflict, "IMMUTABLE_FIELD", "Ese dato no puede modificarse después de crear la venta."}
	case "EF002":
		r = rule{http.StatusConflict, "TASK_SEQUENCE_VIOLATION", "Las tareas deben completarse en orden, una a la vez."}
	case "EF005":
		r = rule{http.StatusUnprocessableEntity, "CATALOG_INCOMPLETE", "El modelo necesita al menos una categoría, una versión y un color con su vista principal."}
	case "EF006":
		r = rule{http.StatusConflict, "LAST_ADMIN_PROTECTED", "Debe quedar al menos un administrador activo."}
	default:
		// Includes EF003 and EF004: they signal a programming mistake, not a user error.
		return Internal(cause)
	}
	return &Error{Code: r.code, Status: r.status, Message: r.message, Err: cause}
}
