// Package logging builds the application logger.
package logging

import (
	"io"
	"log/slog"

	"endosoflow/internal/platform/config"
)

// New returns a logger writing to w in the format and level chosen by the configuration.
// Request bodies, tokens and personal data must never be passed to it.
func New(cfg config.Config, w io.Writer) *slog.Logger {
	options := &slog.HandlerOptions{Level: cfg.LogLevel}
	var handler slog.Handler
	if cfg.LogFormat == "json" {
		handler = slog.NewJSONHandler(w, options)
	} else {
		handler = slog.NewTextHandler(w, options)
	}
	return slog.New(handler).With("env", cfg.Env)
}
