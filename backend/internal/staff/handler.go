package staff

import (
	"endosoflow/internal/auth"
	"endosoflow/internal/platform/apperr"
	"endosoflow/internal/platform/httpx"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// Handler serves the staff routes.
type Handler struct {
	svc    *Service
	auth   *auth.Handler
	logger *slog.Logger
}

// NewHandler builds the handler. The auth handler provides the Authenticate middleware.
func NewHandler(svc *Service, authHandler *auth.Handler, logger *slog.Logger) *Handler {
	return &Handler{svc: svc, auth: authHandler, logger: logger}
}

// Mount registers the routes under the given router (already under /api/v1).
func (h *Handler) Mount(r chi.Router) {
	r.Group(func(r chi.Router) {
		r.Use(h.auth.Authenticate)

		// Admins and Managers may read the advisor picker.
		r.With(auth.RequireRoles(h.logger, auth.RoleSystemAdmin, auth.RoleSalesManager)).Get("/advisors", h.advisors)

		r.Route("/employees", func(r chi.Router) {
			r.Use(auth.RequireRoles(h.logger, auth.RoleSystemAdmin))
			r.Get("/", h.list)
			r.Post("/", h.create)
			r.Get("/{id}", h.get)
			r.Patch("/{id}", h.update)
			r.Delete("/{id}", h.delete)
			r.Post("/{id}/deactivate", h.deactivate)
			r.Post("/{id}/reactivate", h.reactivate)
			r.Post("/{id}/resend-activation", h.resendActivation)
		})
	})
}

func (h *Handler) actor(r *http.Request) auth.Actor {
	actor, _ := auth.ActorFrom(r.Context())
	return actor
}

func (h *Handler) employeeID(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.WriteError(w, r, h.logger, errNotFound)
		return uuid.Nil, false
	}
	return id, true
}

func intParam(r *http.Request, name string, fallback int) (int, error) {
	text := r.URL.Query().Get(name)
	if text == "" {
		return fallback, nil
	}
	value, err := strconv.Atoi(text)
	if err != nil || value < 1 {
		return 0, apperr.BadRequest("INVALID_QUERY", "El parámetro "+name+" no es válido.")
	}
	return value, nil
}

func (h *Handler) list(w http.ResponseWriter, r *http.Request) {
	page, err := intParam(r, "page", 1)
	if err != nil {
		httpx.WriteError(w, r, h.logger, err)
		return
	}
	pageSize, err := intParam(r, "pageSize", 20)
	if err != nil {
		httpx.WriteError(w, r, h.logger, err)
		return
	}
	query := r.URL.Query()
	filter := ListFilter{
		Search: query.Get("q"), Role: query.Get("role"), Status: query.Get("status"),
		Page: page, PageSize: pageSize, Sort: query.Get("sort"),
	}
	switch filter.Role {
	case "", "system_admin", "sales_manager", "sales_advisor":
	default:
		httpx.WriteError(w, r, h.logger, apperr.BadRequest("INVALID_QUERY", "El rol indicado no es válido."))
		return
	}
	switch filter.Status {
	case "", "all", "active", "inactive":
	default:
		httpx.WriteError(w, r, h.logger, apperr.BadRequest("INVALID_QUERY", "El estado indicado no es válido."))
		return
	}
	result, err := h.svc.List(r.Context(), h.actor(r), filter)
	if err != nil {
		httpx.WriteError(w, r, h.logger, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, result)
}

func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	var body CreateInput
	if err := httpx.DecodeJSON(w, r, &body); err != nil {
		httpx.WriteError(w, r, h.logger, err)
		return
	}
	result, err := h.svc.Create(r.Context(), h.actor(r), body)
	if err != nil {
		httpx.WriteError(w, r, h.logger, err)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, result)
}

func (h *Handler) get(w http.ResponseWriter, r *http.Request) {
	id, ok := h.employeeID(w, r)
	if !ok {
		return
	}
	employee, err := h.svc.Get(r.Context(), h.actor(r), id)
	if err != nil {
		httpx.WriteError(w, r, h.logger, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, employee)
}

func (h *Handler) update(w http.ResponseWriter, r *http.Request) {
	id, ok := h.employeeID(w, r)
	if !ok {
		return
	}
	var body UpdateInput
	if err := httpx.DecodeJSON(w, r, &body); err != nil {
		httpx.WriteError(w, r, h.logger, err)
		return
	}
	employee, err := h.svc.Update(r.Context(), h.actor(r), id, body)
	if err != nil {
		httpx.WriteError(w, r, h.logger, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, employee)
}

func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
	id, ok := h.employeeID(w, r)
	if !ok {
		return
	}
	if err := h.svc.Delete(r.Context(), h.actor(r), id, r.URL.Query().Get("reason")); err != nil {
		httpx.WriteError(w, r, h.logger, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) deactivate(w http.ResponseWriter, r *http.Request) {
	id, ok := h.employeeID(w, r)
	if !ok {
		return
	}
	employee, err := h.svc.Deactivate(r.Context(), h.actor(r), id)
	if err != nil {
		httpx.WriteError(w, r, h.logger, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, employee)
}

func (h *Handler) reactivate(w http.ResponseWriter, r *http.Request) {
	id, ok := h.employeeID(w, r)
	if !ok {
		return
	}
	employee, err := h.svc.Reactivate(r.Context(), h.actor(r), id)
	if err != nil {
		httpx.WriteError(w, r, h.logger, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, employee)
}

func (h *Handler) resendActivation(w http.ResponseWriter, r *http.Request) {
	id, ok := h.employeeID(w, r)
	if !ok {
		return
	}
	if err := h.svc.ResendActivation(r.Context(), h.actor(r), id); err != nil {
		httpx.WriteError(w, r, h.logger, err)
		return
	}
	httpx.WriteJSON(w, http.StatusAccepted, map[string]string{"status": "accepted"})
}

func (h *Handler) advisors(w http.ResponseWriter, r *http.Request) {
	advisors, err := h.svc.Advisors(r.Context(), h.actor(r))
	if err != nil {
		httpx.WriteError(w, r, h.logger, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"items": advisors})
}
