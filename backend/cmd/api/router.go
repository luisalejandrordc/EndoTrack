package main

import (
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	"endosoflow/internal/platform/apperr"
	"endosoflow/internal/platform/health"
	"endosoflow/internal/platform/httpx"
)

// newRouter wires the middleware and the routes. Modules register their routes here as they are built.
func newRouter(logger *slog.Logger, db health.Pinger) http.Handler {
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
	})
	return r
}
