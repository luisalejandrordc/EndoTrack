package customers

import (
	"endosoflow/internal/platform/apperr"
	"regexp"
	"strings"
	"unicode/utf8"
)

// rawData is customer data before validation (strings as typed by the person).
type rawData struct {
	CustomerType, DocumentType, DocumentNumber         string
	FirstName, LastName, Gender, LegalName, NameSource string
	Nationality, Phone, Email                          string
	ContactFirstName, ContactLastName, ContactJobTitle string
}

// customerData is validated and normalized, ready to store. Fields that do not apply to the customer
// type are nil, which is what the database shape constraint requires.
type customerData struct {
	CustomerType, DocumentType, DocumentNumber         string
	FirstName, LastName, Gender, LegalName             *string
	NameSource, Nationality, Phone, Email              string
	ContactFirstName, ContactLastName, ContactJobTitle *string
}

var (
	phonePattern = regexp.MustCompile(`^[0-9+()\-\s]{6,20}$`)
	emailPattern = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)

	// documentPatterns mirror the customers_document_format constraint.
	documentPatterns = map[string]*regexp.Regexp{
		"DNI": regexp.MustCompile(`^[0-9]{8}$`),
		"RUC": regexp.MustCompile(`^[0-9]{11}$`),
		"CE":  regexp.MustCompile(`^[A-Z0-9]{9}$`),
		"PAS": regexp.MustCompile(`^[A-Z0-9]{6,12}$`),
		"CDI": regexp.MustCompile(`^[A-Z0-9]{8,12}$`),
	}
)

func isCustomerType(t string) bool {
	switch t {
	case TypeDiplomat, TypeEmbassy, TypeCatholicEntity, TypeOtherReligious, TypeInternationalOrg:
		return true
	}
	return false
}

// normalizeDocument trims, upper-cases and removes inner spaces, then checks the format for the type.
func normalizeDocument(docType, docNumber string) (string, string, bool) {
	t := strings.ToUpper(strings.TrimSpace(docType))
	n := strings.ToUpper(strings.ReplaceAll(strings.TrimSpace(docNumber), " ", ""))
	pattern, known := documentPatterns[t]
	return t, n, known && pattern.MatchString(n)
}

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

func (v *validator) email(field, label, value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	switch {
	case value == "":
		v.fail(field, "REQUIRED", label+" es obligatorio.")
	case len(value) > 254 || !emailPattern.MatchString(value):
		v.fail(field, "INVALID_EMAIL", label+" no es un correo válido.")
	}
	return value
}

func (v *validator) phone(field, label, value string) string {
	value = strings.TrimSpace(value)
	switch {
	case value == "":
		v.fail(field, "REQUIRED", label+" es obligatorio.")
	case !phonePattern.MatchString(value):
		v.fail(field, "INVALID_PHONE", label+" no es un teléfono válido.")
	}
	return value
}

func ptr(s string) *string { return &s }

// validateData checks every field and returns the normalized data, or a VALIDATION_FAILED error that
// lists every problem at once.
func validateData(in rawData) (customerData, *apperr.Error) {
	v := &validator{}
	var out customerData

	out.CustomerType = strings.TrimSpace(in.CustomerType)
	typeKnown := isCustomerType(out.CustomerType)
	if !typeKnown {
		v.fail("customerType", "INVALID_VALUE",
			"El tipo de cliente debe ser diplomatico, embajada, entidad_religiosa_catolica, entidad_religiosa_no_catolica u organismo_internacional.")
	}
	person := out.CustomerType == TypeDiplomat

	docType, docNumber, formatOK := normalizeDocument(in.DocumentType, in.DocumentNumber)
	out.DocumentType, out.DocumentNumber = docType, docNumber
	if _, known := documentPatterns[docType]; !known {
		v.fail("documentType", "INVALID_VALUE", "El tipo de documento debe ser DNI, CE, PAS, CDI o RUC.")
	} else {
		if typeKnown && person && docType == "RUC" {
			v.fail("documentType", "DOCUMENT_TYPE_NOT_ALLOWED", "Un diplomático se identifica con DNI, CE, PAS o CDI.")
		}
		if typeKnown && !person && docType != "RUC" {
			v.fail("documentType", "DOCUMENT_TYPE_NOT_ALLOWED", "Una organización se identifica con RUC.")
		}
		if !formatOK {
			v.fail("documentNumber", "INVALID_DOCUMENT",
				"El número de documento no es válido (DNI: 8 dígitos; RUC: 11 dígitos; CE: 9 caracteres alfanuméricos; PAS: 6 a 12; CDI: 8 a 12).")
		}
	}

	out.NameSource = strings.TrimSpace(in.NameSource)
	if out.NameSource == "" {
		out.NameSource = "manual"
	}
	if out.NameSource != "manual" && out.NameSource != "looked_up" {
		v.fail("nameSource", "INVALID_VALUE", "El origen del nombre debe ser manual o looked_up.")
	}

	out.Nationality = v.text("nationality", "La nacionalidad", in.Nationality, 60)
	out.Phone = v.phone("phone", "El teléfono", in.Phone)
	out.Email = v.email("email", "El correo", in.Email)

	if typeKnown {
		if person {
			out.FirstName = ptr(v.text("firstName", "El nombre", in.FirstName, 80))
			out.LastName = ptr(v.text("lastName", "El apellido", in.LastName, 80))
			gender := strings.ToUpper(strings.TrimSpace(in.Gender))
			if gender != "M" && gender != "F" {
				v.fail("gender", "INVALID_VALUE", "El género debe ser M o F.")
			}
			out.Gender = &gender
		} else {
			out.LegalName = ptr(v.text("legalName", "La razón social", in.LegalName, 200))
			out.ContactFirstName = ptr(v.text("contactFirstName", "El nombre del contacto", in.ContactFirstName, 80))
			out.ContactLastName = ptr(v.text("contactLastName", "El apellido del contacto", in.ContactLastName, 80))
			out.ContactJobTitle = ptr(v.text("contactJobTitle", "El cargo del contacto", in.ContactJobTitle, 100))
		}
	}

	if len(v.problems) > 0 {
		return customerData{}, apperr.Unprocessable("VALIDATION_FAILED", "Revise los datos ingresados.").
			WithFields(v.problems...)
	}
	return out, nil
}
