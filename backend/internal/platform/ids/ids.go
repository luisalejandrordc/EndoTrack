// Package ids generates identifiers.
package ids

import "github.com/google/uuid"

// New returns a time-ordered UUIDv7, which keeps database indexes compact and fast.
func New() uuid.UUID {
	return uuid.Must(uuid.NewV7())
}

// NewString returns New() formatted as text.
func NewString() string {
	return New().String()
}
