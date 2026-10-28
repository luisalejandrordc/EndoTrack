// Package catalog manages the vehicle catalog: models with their categories, versions (with a reference
// price) and colors (with up to six images each). Admins and Managers write; every staff role reads, but
// Advisors only see active entries. Archiving replaces deleting, and edits never touch the snapshots stored
// on existing sales.
package catalog

import (
	"strings"
	"time"

	"github.com/google/uuid"
)

// Categories and viewpoints mirror the database enums.
var (
	categories = []string{"camioneta", "comercial", "familiar", "hatchback", "sedan"}
	viewpoints = []string{"main_view", "exterior_front", "exterior_left", "exterior_right", "exterior_rear", "interior"}
)

// MainView is the viewpoint every color must have.
const MainView = "main_view"

func isCategory(s string) bool  { return contains(categories, s) }
func isViewpoint(s string) bool { return contains(viewpoints, s) }

func contains(list []string, s string) bool {
	for _, item := range list {
		if item == s {
			return true
		}
	}
	return false
}

// Image is one picture of a color. The URL is public.
type Image struct {
	ID        uuid.UUID `json:"id"`
	Viewpoint string    `json:"viewpoint"`
	URL       string    `json:"url"`
	MimeType  string    `json:"mimeType"`
	SizeBytes int       `json:"sizeBytes"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// Version is a trim level of a model. ReferencePrice is a decimal string such as "35000.00": money never
// travels as a floating-point number.
type Version struct {
	ID             uuid.UUID `json:"id"`
	ModelID        uuid.UUID `json:"modelId"`
	Name           string    `json:"name"`
	ReferencePrice string    `json:"referencePrice"`
	IsActive       bool      `json:"isActive"`
	Version        int       `json:"version"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

// Color belongs to one model. MainImageURL is the Main view image, which always exists.
type Color struct {
	ID           uuid.UUID `json:"id"`
	ModelID      uuid.UUID `json:"modelId"`
	Name         string    `json:"name"`
	IsActive     bool      `json:"isActive"`
	MainImageURL string    `json:"mainImageUrl"`
	Images       []Image   `json:"images"`
	Version      int       `json:"version"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// Model is a vehicle model with everything under it.
type Model struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Description *string   `json:"description"`
	Categories  []string  `json:"categories"`
	IsActive    bool      `json:"isActive"`
	Versions    []Version `json:"versions"`
	Colors      []Color   `json:"colors"`
	Version     int       `json:"version"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// ModelSummary is a row of the model list.
type ModelSummary struct {
	ID                 uuid.UUID `json:"id"`
	Name               string    `json:"name"`
	Description        *string   `json:"description"`
	Categories         []string  `json:"categories"`
	IsActive           bool      `json:"isActive"`
	ActiveVersionCount int       `json:"activeVersionCount"`
	ActiveColorCount   int       `json:"activeColorCount"`
	MinPrice           *string   `json:"minPrice"`
	MainImageURL       *string   `json:"mainImageUrl"`
	Version            int       `json:"version"`
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`
}

// ModelList is one page of models.
type ModelList struct {
	Items    []ModelSummary `json:"items"`
	Page     int            `json:"page"`
	PageSize int            `json:"pageSize"`
	Total    int            `json:"total"`
}

// ModelFilter selects and orders the list of models.
type ModelFilter struct {
	Search   string
	Category string
	Status   string // active, archived or all (default all; Advisors always get active)
	Page     int
	PageSize int
	Sort     string // name (default), -name, createdAt, -createdAt
}

// Money is a price as typed: a JSON number or string. It is parsed and checked during validation, so a bad
// value becomes a field error instead of a malformed-body error.
type Money struct {
	Raw string
	Set bool
}

// UnmarshalJSON keeps the text of the value.
func (m *Money) UnmarshalJSON(b []byte) error {
	text := strings.TrimSpace(string(b))
	if text == "null" {
		return nil
	}
	m.Raw = strings.Trim(text, `"`)
	m.Set = true
	return nil
}

// VersionInput creates a version.
type VersionInput struct {
	Name           string `json:"name"`
	ReferencePrice Money  `json:"referencePrice"`
}

// ColorInput creates a color. Its Main view image travels with it as a file.
type ColorInput struct {
	Name string `json:"name"`
}

// CreateModelInput creates a model together with its first version and color; the color's Main view image
// travels as a file in the same request.
type CreateModelInput struct {
	Name        string       `json:"name"`
	Description string       `json:"description"`
	Categories  []string     `json:"categories"`
	Version     VersionInput `json:"version"`
	Color       ColorInput   `json:"color"`
}

// UpdateModelInput changes only what is present. Version is required.
type UpdateModelInput struct {
	Version     *int      `json:"version"`
	Name        *string   `json:"name"`
	Description *string   `json:"description"` // an empty string clears it
	Categories  *[]string `json:"categories"`
}

// UpdateVersionInput changes only what is present. Version is required.
type UpdateVersionInput struct {
	Version        *int    `json:"version"`
	Name           *string `json:"name"`
	ReferencePrice *Money  `json:"referencePrice"`
}

// UpdateColorInput changes only what is present. Version is required.
type UpdateColorInput struct {
	Version *int    `json:"version"`
	Name    *string `json:"name"`
}

// Selectable is what the sale form offers: active models that have at least one selectable version and
// color.
type Selectable struct {
	ID         uuid.UUID           `json:"id"`
	Name       string              `json:"name"`
	Categories []string            `json:"categories"`
	Versions   []SelectableVersion `json:"versions"`
	Colors     []SelectableColor   `json:"colors"`
}

// SelectableVersion is a choosable version.
type SelectableVersion struct {
	ID             uuid.UUID `json:"id"`
	Name           string    `json:"name"`
	ReferencePrice string    `json:"referencePrice"`
}

// SelectableColor is a choosable color with its Main view image.
type SelectableColor struct {
	ID           uuid.UUID `json:"id"`
	Name         string    `json:"name"`
	MainImageURL string    `json:"mainImageUrl"`
}
