// Package health serves the liveness and database check used by the hosting platform.
package health

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"endosoflow/internal/platform/httpx"
)

// Pinger is satisfied by the database pool (and by fakes in tests).
type Pinger interface {
	Ping(ctx context.Context) error
}

// Handler answers 200 when the database responds and 503 when it does not.
func Handler(db Pinger, logger *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()

		status := http.StatusOK
		body := map[string]string{"status": "ok", "database": "ok"}
		if err := db.Ping(ctx); err != nil {
			logger.Warn("health check: database unreachable", "error", err)
			status = http.StatusServiceUnavailable
			body = map[string]string{"status": "degraded", "database": "error"}
		}
		httpx.WriteJSON(w, status, body)
	}
}
