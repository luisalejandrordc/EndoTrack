package staff

import (
	"endosoflow/internal/auth"
	"endosoflow/internal/platform/apperr"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"
)

// rawData is employee data before validation (strings as typed by the person).
type rawData struct {
	DocumentType, DocumentNumber, FirstName, LastName, NameSource string
	Nationality, Gender, Birthdate, HireDate                      string
	PersonalPhone, PersonalEmail                                  string
	BusinessPhone, BusinessEmail, Role                            string
}

// employeeData is validated and normalized, ready to store.
type employeeData struct {
	DocumentType, DocumentNumber, FirstName, LastName, NameSource string
	Nationality, Gender                                           string
	Birthdate, HireDate                                           time.Time
	PersonalPhone, PersonalEmail                                  *string
	BusinessPhone, BusinessEmail, Role                            string
}

var (
	phonePattern = regexp.MustCompile(`^[0-9+()\-\s]{6,20}$`)
	emailPattern = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)
)

type validator struct {
	problems []apperr.FieldError
}

func (v *validator) fail(field, code, message string) {
	v.problems = append(v.problems, apperr.FieldError{Field: field, Code: code, Message: message})
}

func (v *validator) text(field, label, value string, max int) string {
	value = strings.TrimSpace(value)
	switch {
	case value == "":
		v.fail(field, "REQUIRED", label+" es obligatorio.")
	case utf8.RuneCountInString(value) > max:
		v.fail(field, "TOO_LONG", label+" es demasiado largo.")
	}
	return value
}

func (v *validator) date(field, label, value string, earliest, latest time.Time) time.Time {
	parsed, err := time.Parse("2006-01-02", strings.TrimSpace(value))
	if err != nil {
		v.fail(field, "INVALID_DATE", label+" debe tener el formato AAAA-MM-DD.")
		return time.Time{}
	}
	if parsed.Before(earliest) || parsed.After(latest) {
		v.fail(field, "DATE_OUT_OF_RANGE", label+" está fuera del rango permitido.")
	}
	return parsed
}

func (v *validator) email(field, label, value string, required bool) string {
	value = strings.ToLower(strings.TrimSpace(value))
	switch {
	case value == "" && required:
		v.fail(field, "REQUIRED", label+" es obligatorio.")
	case value != "" && (len(value) > 254 || !emailPattern.MatchString(value)):
		v.fail(field, "INVALID_EMAIL", label+" no es un correo válido.")
	}
	return value
}

func (v *validator) phone(field, label, value string, required bool) string {
	value = strings.TrimSpace(value)
	switch {
	case value == "" && required:
		v.fail(field, "REQUIRED", label+" es obligatorio.")
	case value != "" && !phonePattern.MatchString(value):
		v.fail(field, "INVALID_PHONE", label+" no es un teléfono válido.")
	}
	return value
}

func optional(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}

// validateData checks every field and returns the normalized data, or a VALIDATION_FAILED error that lists
// every problem at once.
func validateData(in rawData, now time.Time) (employeeData, *apperr.Error) {
	v := &validator{}
	var out employeeData

	docType, docNumber, ok := auth.NormalizeIdentifier(in.DocumentType, in.DocumentNumber)
	if !ok {
		v.fail("documentNumber", "INVALID_DOCUMENT",
			"El documento no es válido (DNI: 8 dígitos; CE: 9 caracteres alfanuméricos; PAS: 6 a 12 caracteres alfanuméricos).")
	}
	out.DocumentType, out.DocumentNumber = docType, docNumber

	out.FirstName = v.text("firstName", "El nombre", in.FirstName, 80)
	out.LastName = v.text("lastName", "El apellido", in.LastName, 80)
	out.Nationality = v.text("nationality", "La nacionalidad", in.Nationality, 60)

	out.NameSource = strings.TrimSpace(in.NameSource)
	if out.NameSource == "" {
		out.NameSource = "manual"
	}
	if out.NameSource != "manual" && out.NameSource != "looked_up" {
		v.fail("nameSource", "INVALID_VALUE", "El origen del nombre debe ser manual o looked_up.")
	}

	out.Gender = strings.ToUpper(strings.TrimSpace(in.Gender))
	if out.Gender != "M" && out.Gender != "F" {
		v.fail("gender", "INVALID_VALUE", "El género debe ser M o F.")
	}

	out.Role = strings.TrimSpace(in.Role)
	switch out.Role {
	case string(auth.RoleSystemAdmin), string(auth.RoleSalesManager), string(auth.RoleSalesAdvisor):
	default:
		v.fail("role", "INVALID_VALUE", "El rol debe ser system_admin, sales_manager o sales_advisor.")
	}

	out.Birthdate = v.date("birthdate", "La fecha de nacimiento", in.Birthdate,
		time.Date(1900, 1, 1, 0, 0, 0, 0, time.UTC), now.AddDate(-16, 0, 0))
	out.HireDate = v.date("hireDate", "La fecha de ingreso", in.HireDate,
		time.Date(1990, 1, 1, 0, 0, 0, 0, time.UTC), now.AddDate(1, 0, 0))

	out.BusinessPhone = v.phone("businessPhone", "El teléfono corporativo", in.BusinessPhone, true)
	out.BusinessEmail = v.email("businessEmail", "El correo corporativo", in.BusinessEmail, true)
	out.PersonalPhone = optional(v.phone("personalPhone", "El teléfono personal", in.PersonalPhone, false))
	out.PersonalEmail = optional(v.email("personalEmail", "El correo personal", in.PersonalEmail, false))

	if len(v.problems) > 0 {
		return employeeData{}, apperr.Unprocessable("VALIDATION_FAILED", "Revise los datos ingresados.").
			WithFields(v.problems...)
	}
	return out, nil
}
