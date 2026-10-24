package main

import (
	"endosoflow/internal/platform/apperr"
	"endosoflow/internal/platform/health"
	"endosoflow/internal/platform/httpx"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
)

// newRouter wires the middleware and the routes. Each module passes a function that mounts its routes
// under /api/v1.
func newRouter(logger *slog.Logger, db health.Pinger, mounts ...func(chi.Router)) http.Handler {
	r := chi.NewRouter()
	r.Use(httpx.RequestID, httpx.Recover(logger), httpx.AccessLog(logger), httpx.SecurityHeaders)

	r.NotFound(func(w http.ResponseWriter, req *http.Request) {
		httpx.WriteError(w, req, logger, apperr.NotFound("ROUTE_NOT_FOUND", "La ruta solicitada no existe."))
	})
	r.MethodNotAllowed(func(w http.ResponseWriter, req *http.Request) {
		httpx.WriteError(w, req, logger, apperr.New(http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Método no permitido."))
	})

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", health.Handler(db, logger))
		for _, mount := range mounts {
			mount(r)
		}
	})
	return r
}
