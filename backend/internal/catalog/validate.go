package catalog

import (
	"endosoflow/internal/platform/apperr"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"
)

// MaxImageBytes is the largest accepted image (FR-032).
const MaxImageBytes = 5 << 20

var pricePattern = regexp.MustCompile(`^[0-9]{1,10}(\.[0-9]{1,2})?$`)

// parsePrice turns "35000", "35000.5" or "35000.50" into cents. It rejects zero, negatives, more than two
// decimals and anything that would not fit numeric(12,2).
func parsePrice(raw string) (int64, bool) {
	raw = strings.TrimSpace(raw)
	if !pricePattern.MatchString(raw) {
		return 0, false
	}
	whole, frac, _ := strings.Cut(raw, ".")
	for len(frac) < 2 {
		frac += "0"
	}
	units, err := strconv.ParseInt(whole, 10, 64)
	if err != nil {
		return 0, false
	}
	cents, err := strconv.ParseInt(frac, 10, 64)
	if err != nil {
		return 0, false
	}
	total := units*100 + cents
	return total, total > 0
}

func formatCents(cents int64) string { return fmt.Sprintf("%d.%02d", cents/100, cents%100) }

type validator struct{ problems []apperr.FieldError }

func (v *validator) fail(field, code, message string) {
	v.problems = append(v.problems, apperr.FieldError{Field: field, Code: code, Message: message})
}

func (v *validator) name(field, label, value string, max int) string {
	value = strings.TrimSpace(value)
	switch {
	case value == "":
		v.fail(field, "REQUIRED", label+" es obligatorio.")
	case utf8.RuneCountInString(value) > max:
		v.fail(field, "TOO_LONG", label+" es demasiado largo.")
	}
	return value
}

func (v *validator) description(value string) *string {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	if utf8.RuneCountInString(value) > 1000 {
		v.fail("description", "TOO_LONG", "La descripción es demasiado larga (máximo 1000 caracteres).")
	}
	return &value
}

func (v *validator) categories(list []string) []string {
	seen := map[string]bool{}
	var out []string
	for _, c := range list {
		c = strings.ToLower(strings.TrimSpace(c))
		if !isCategory(c) {
			v.fail("categories", "INVALID_VALUE", "Las categorías válidas son camioneta, comercial, familiar, hatchback y sedan.")
			return nil
		}
		if !seen[c] {
			seen[c] = true
			out = append(out, c)
		}
	}
	if len(out) == 0 {
		v.fail("categories", "REQUIRED", "El modelo necesita al menos una categoría.")
	}
	return out
}

func (v *validator) price(field string, m Money) int64 {
	if !m.Set {
		v.fail(field, "REQUIRED", "El precio de referencia es obligatorio.")
		return 0
	}
	cents, ok := parsePrice(m.Raw)
	if !ok {
		v.fail(field, "INVALID_PRICE", "El precio debe ser mayor que cero, con hasta dos decimales.")
	}
	return cents
}

func (v *validator) result() *apperr.Error {
	if len(v.problems) == 0 {
		return nil
	}
	return apperr.Unprocessable("VALIDATION_FAILED", "Revise los datos ingresados.").WithFields(v.problems...)
}

// modelData is validated model data.
type modelData struct {
	Name        string
	Description *string
	Categories  []string
}

func validateModel(name, description string, cats []string) (modelData, *validator) {
	v := &validator{}
	return modelData{
		Name:        v.name("name", "El nombre del modelo", name, 120),
		Description: v.description(description),
		Categories:  v.categories(cats),
	}, v
}

// imageFile is a validated image: its real type comes from the bytes, never from the client.
type imageFile struct {
	Data      []byte
	MimeType  string
	Extension string
}

var imageTypes = map[string]string{"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}

var (
	errImageRequired = apperr.Unprocessable("IMAGE_REQUIRED", "Falta la imagen.").
				WithFields(apperr.FieldError{Field: "image", Code: "REQUIRED", Message: "La imagen es obligatoria."})
	errImageTooLarge = apperr.New(http.StatusRequestEntityTooLarge, "IMAGE_TOO_LARGE", "La imagen supera el máximo de 5 MB.")
	errImageType     = apperr.Unprocessable("IMAGE_TYPE_NOT_ALLOWED", "La imagen debe ser JPEG, PNG o WebP.")
)

// checkImage validates size and real content type.
func checkImage(data []byte) (*imageFile, *apperr.Error) {
	if len(data) == 0 {
		return nil, errImageRequired
	}
	if len(data) > MaxImageBytes {
		return nil, errImageTooLarge
	}
	sniffed := http.DetectContentType(data)
	ext, ok := imageTypes[sniffed]
	if !ok {
		return nil, errImageType
	}
	return &imageFile{Data: data, MimeType: sniffed, Extension: ext}, nil
}
