package catalog

import (
	"encoding/json"
	"endosoflow/internal/auth"
	"endosoflow/internal/platform/apperr"
	"endosoflow/internal/platform/httpx"
	"errors"
	"io"
	"log/slog"
	"mime"
	"mime/multipart"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

// Handler serves the catalog routes.
type Handler struct {
	svc    *Service
	auth   *auth.Handler
	logger *slog.Logger
}

// NewHandler builds the handler.
func NewHandler(svc *Service, authHandler *auth.Handler, logger *slog.Logger) *Handler {
	return &Handler{svc: svc, auth: authHandler, logger: logger}
}

// Mount registers the routes under the given router (already under /api/v1). Reads are open to every staff
// role; writes need Admin or Manager; permanent deletion needs Admin. The service checks again.
func (h *Handler) Mount(r chi.Router) {
	staff := auth.RequireRoles(h.logger, auth.RoleSystemAdmin, auth.RoleSalesManager, auth.RoleSalesAdvisor)
	management := auth.RequireRoles(h.logger, auth.RoleSystemAdmin, auth.RoleSalesManager)
	adminOnly := auth.RequireRoles(h.logger, auth.RoleSystemAdmin)

	r.Group(func(r chi.Router) {
		r.Use(h.auth.Authenticate)

		r.With(staff).Get("/catalog/selectable", h.selectable)

		r.Route("/vehicle-models", func(r chi.Router) {
			r.With(staff).Get("/", h.listModels)
			r.With(management).Post("/", h.createModel)
			r.Route("/{id}", func(r chi.Router) {
				r.With(staff).Get("/", h.getModel)
				r.With(management).Patch("/", h.updateModel)
				r.With(adminOnly).Delete("/", h.deleteModel)
				r.With(management).Post("/archive", h.archiveModel)
				r.With(management).Post("/unarchive", h.unarchiveModel)
				r.With(management).Post("/versions", h.createVersion)
				r.With(management).Post("/colors", h.createColor)
			})
		})
		r.Route("/vehicle-versions/{id}", func(r chi.Router) {
			r.With(management).Patch("/", h.updateVersion)
			r.With(adminOnly).Delete("/", h.deleteVersion)
			r.With(management).Post("/archive", h.archiveVersion)
			r.With(management).Post("/unarchive", h.unarchiveVersion)
		})
		r.Route("/vehicle-colors/{id}", func(r chi.Router) {
			r.With(management).Patch("/", h.updateColor)
			r.With(adminOnly).Delete("/", h.deleteColor)
			r.With(management).Post("/archive", h.archiveColor)
			r.With(management).Post("/unarchive", h.unarchiveColor)
			r.With(management).Put("/images/{viewpoint}", h.putImage)
			r.With(management).Delete("/images/{viewpoint}", h.deleteImage)
		})
	})
}

func (h *Handler) actor(r *http.Request) auth.Actor {
	a, _ := auth.ActorFrom(r.Context())
	return a
}

func (h *Handler) fail(w http.ResponseWriter, r *http.Request, err error) {
	httpx.WriteError(w, r, h.logger, err)
}

func (h *Handler) id(w http.ResponseWriter, r *http.Request, notFound *apperr.Error) (uuid.UUID, bool) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		h.fail(w, r, notFound)
		return uuid.Nil, false
	}
	return id, true
}

func intParam(r *http.Request, name string, fallback int) (int, error) {
	text := r.URL.Query().Get(name)
	if text == "" {
		return fallback, nil
	}
	v, err := strconv.Atoi(text)
	if err != nil || v < 1 {
		return 0, apperr.BadRequest("INVALID_QUERY", "El parámetro "+name+" no es válido.")
	}
	return v, nil
}

// --- multipart ---

// maxMultipartBytes allows the largest image plus the small JSON part and the multipart framing.
const maxMultipartBytes = MaxImageBytes + 256<<10

const maxJSONPartBytes = 64 << 10

// readMultipart reads a request made of an optional JSON part called "data" and one file part. It streams
// the body and never keeps more than the image limit in memory.
func readMultipart(w http.ResponseWriter, r *http.Request, fileField string, data any) ([]byte, error) {
	mediaType, params, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil || mediaType != "multipart/form-data" || params["boundary"] == "" {
		return nil, apperr.BadRequest("INVALID_MULTIPART", "La solicitud debe enviarse como multipart/form-data.")
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxMultipartBytes)
	reader := multipart.NewReader(r.Body, params["boundary"])

	var file []byte
	sawData := false
	for {
		part, err := reader.NextPart()
		if errors.Is(err, io.EOF) {
			break
		}
		if err != nil {
			return nil, multipartError(err)
		}
		switch part.FormName() {
		case "data":
			if data == nil || sawData {
				return nil, apperr.BadRequest("INVALID_MULTIPART", "La solicitud no es válida.")
			}
			sawData = true
			raw, err := io.ReadAll(io.LimitReader(part, maxJSONPartBytes+1))
			if err != nil {
				return nil, multipartError(err)
			}
			if len(raw) > maxJSONPartBytes {
				return nil, apperr.BadRequest("INVALID_JSON", "Los datos son demasiado grandes.")
			}
			decoder := json.NewDecoder(bytesReader(raw))
			decoder.DisallowUnknownFields()
			if err := decoder.Decode(data); err != nil {
				return nil, apperr.BadRequest("INVALID_JSON", "Los datos de la solicitud no son válidos.").WithCause(err)
			}
		case fileField:
			if file != nil {
				return nil, apperr.BadRequest("INVALID_MULTIPART", "Envíe una sola imagen.")
			}
			file, err = io.ReadAll(io.LimitReader(part, MaxImageBytes+1))
			if err != nil {
				return nil, multipartError(err)
			}
		default:
			return nil, apperr.BadRequest("INVALID_MULTIPART", "La solicitud contiene una parte desconocida.")
		}
	}
	if data != nil && !sawData {
		return nil, apperr.BadRequest("INVALID_JSON", "Faltan los datos de la solicitud.")
	}
	return file, nil
}

func multipartError(err error) error {
	var tooBig *http.MaxBytesError
	if errors.As(err, &tooBig) {
		return errImageTooLarge
	}
	return apperr.BadRequest("INVALID_MULTIPART", "No se pudo leer la solicitud.").WithCause(err)
}

type byteSliceReader struct {
	b []byte
	i int
}

func bytesReader(b []byte) io.Reader { return &byteSliceReader{b: b} }

func (r *byteSliceReader) Read(p []byte) (int, error) {
	if r.i >= len(r.b) {
		return 0, io.EOF
	}
	n := copy(p, r.b[r.i:])
	r.i += n
	return n, nil
}

// --- models ---

func (h *Handler) listModels(w http.ResponseWriter, r *http.Request) {
	page, err := intParam(r, "page", 1)
	if err != nil {
		h.fail(w, r, err)
		return
	}
	pageSize, err := intParam(r, "pageSize", 20)
	if err != nil {
		h.fail(w, r, err)
		return
	}
	q := r.URL.Query()
	f := ModelFilter{Search: q.Get("q"), Category: q.Get("category"), Status: q.Get("status"), Page: page, PageSize: pageSize, Sort: q.Get("sort")}
	if f.Category != "" && !isCategory(f.Category) {
		h.fail(w, r, apperr.BadRequest("INVALID_QUERY", "La categoría indicada no es válida."))
		return
	}
	switch f.Status {
	case "", "all", "active", "archived":
	default:
		h.fail(w, r, apperr.BadRequest("INVALID_QUERY", "El estado indicado no es válido."))
		return
	}
	result, err := h.svc.List(r.Context(), h.actor(r), f)
	if err != nil {
		h.fail(w, r, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, result)
}

func (h *Handler) createModel(w http.ResponseWriter, r *http.Request) {
	var in CreateModelInput
	image, err := readMultipart(w, r, "mainImage", &in)
	if err != nil {
		h.fail(w, r, err)
		return
	}
	model, err := h.svc.CreateModel(r.Context(), h.actor(r), in, image)
	if err != nil {
		h.fail(w, r, err)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, model)
}

func (h *Handler) getModel(w http.ResponseWriter, r *http.Request) {
	id, ok := h.id(w, r, errModelNotFound)
	if !ok {
		return
	}
	model, err := h.svc.Get(r.Context(), h.actor(r), id)
	if err != nil {
		h.fail(w, r, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, model)
}

func (h *Handler) updateModel(w http.ResponseWriter, r *http.Request) {
	id, ok := h.id(w, r, errModelNotFound)
	if !ok {
		return
	}
	var in UpdateModelInput
	if err := httpx.DecodeJSON(w, r, &in); err != nil {
		h.fail(w, r, err)
		return
	}
	model, err := h.svc.UpdateModel(r.Context(), h.actor(r), id, in)
	if err != nil {
		h.fail(w, r, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, model)
}

func (h *Handler) modelAction(w http.ResponseWriter, r *http.Request, do func(*Service, auth.Actor, uuid.UUID) (*Model, error)) {
	id, ok := h.id(w, r, errModelNotFound)
	if !ok {
		return
	}
	model, err := do(h.svc, h.actor(r), id)
	if err != nil {
		h.fail(w, r, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, model)
}

func (h *Handler) archiveModel(w http.ResponseWriter, r *http.Request) {
	h.modelAction(w, r, func(s *Service, a auth.Actor, id uuid.UUID) (*Model, error) {
		return s.ArchiveModel(r.Context(), a, id)
	})
}

func (h *Handler) unarchiveModel(w http.ResponseWriter, r *http.Request) {
	h.modelAction(w, r, func(s *Service, a auth.Actor, id uuid.UUID) (*Model, error) {
		return s.UnarchiveModel(r.Context(), a, id)
	})
}

func (h *Handler) deleteModel(w http.ResponseWriter, r *http.Request) {
	id, ok := h.id(w, r, errModelNotFound)
	if !ok {
		return
	}
	if err := h.svc.DeleteModel(r.Context(), h.actor(r), id, r.URL.Query().Get("reason")); err != nil {
		h.fail(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) selectable(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.Selectable(r.Context(), h.actor(r))
	if err != nil {
		h.fail(w, r, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, map[string]any{"items": items})
}

// --- versions ---

func (h *Handler) createVersion(w http.ResponseWriter, r *http.Request) {
	id, ok := h.id(w, r, errModelNotFound)
	if !ok {
		return
	}
	var in VersionInput
	if err := httpx.DecodeJSON(w, r, &in); err != nil {
		h.fail(w, r, err)
		return
	}
	version, err := h.svc.CreateVersion(r.Context(), h.actor(r), id, in)
	if err != nil {
		h.fail(w, r, err)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, version)
}

func (h *Handler) updateVersion(w http.ResponseWriter, r *http.Request) {
	id, ok := h.id(w, r, errVersionNotFound)
	if !ok {
		return
	}
	var in UpdateVersionInput
	if err := httpx.DecodeJSON(w, r, &in); err != nil {
		h.fail(w, r, err)
		return
	}
	version, err := h.svc.UpdateVersion(r.Context(), h.actor(r), id, in)
	if err != nil {
		h.fail(w, r, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, version)
}

func (h *Handler) versionAction(w http.ResponseWriter, r *http.Request, do func(uuid.UUID) (*Version, error)) {
	id, ok := h.id(w, r, errVersionNotFound)
	if !ok {
		return
	}
	version, err := do(id)
	if err != nil {
		h.fail(w, r, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, version)
}

func (h *Handler) archiveVersion(w http.ResponseWriter, r *http.Request) {
	h.versionAction(w, r, func(id uuid.UUID) (*Version, error) { return h.svc.ArchiveVersion(r.Context(), h.actor(r), id) })
}

func (h *Handler) unarchiveVersion(w http.ResponseWriter, r *http.Request) {
	h.versionAction(w, r, func(id uuid.UUID) (*Version, error) { return h.svc.UnarchiveVersion(r.Context(), h.actor(r), id) })
}

func (h *Handler) deleteVersion(w http.ResponseWriter, r *http.Request) {
	id, ok := h.id(w, r, errVersionNotFound)
	if !ok {
		return
	}
	if err := h.svc.DeleteVersion(r.Context(), h.actor(r), id, r.URL.Query().Get("reason")); err != nil {
		h.fail(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// --- colors and images ---

func (h *Handler) createColor(w http.ResponseWriter, r *http.Request) {
	id, ok := h.id(w, r, errModelNotFound)
	if !ok {
		return
	}
	var in ColorInput
	image, err := readMultipart(w, r, "mainImage", &in)
	if err != nil {
		h.fail(w, r, err)
		return
	}
	color, err := h.svc.CreateColor(r.Context(), h.actor(r), id, in, image)
	if err != nil {
		h.fail(w, r, err)
		return
	}
	httpx.WriteJSON(w, http.StatusCreated, color)
}

func (h *Handler) updateColor(w http.ResponseWriter, r *http.Request) {
	id, ok := h.id(w, r, errColorNotFound)
	if !ok {
		return
	}
	var in UpdateColorInput
	if err := httpx.DecodeJSON(w, r, &in); err != nil {
		h.fail(w, r, err)
		return
	}
	color, err := h.svc.UpdateColor(r.Context(), h.actor(r), id, in)
	if err != nil {
		h.fail(w, r, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, color)
}

func (h *Handler) colorAction(w http.ResponseWriter, r *http.Request, do func(uuid.UUID) (*Color, error)) {
	id, ok := h.id(w, r, errColorNotFound)
	if !ok {
		return
	}
	color, err := do(id)
	if err != nil {
		h.fail(w, r, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, color)
}

func (h *Handler) archiveColor(w http.ResponseWriter, r *http.Request) {
	h.colorAction(w, r, func(id uuid.UUID) (*Color, error) { return h.svc.ArchiveColor(r.Context(), h.actor(r), id) })
}

func (h *Handler) unarchiveColor(w http.ResponseWriter, r *http.Request) {
	h.colorAction(w, r, func(id uuid.UUID) (*Color, error) { return h.svc.UnarchiveColor(r.Context(), h.actor(r), id) })
}

func (h *Handler) deleteColor(w http.ResponseWriter, r *http.Request) {
	id, ok := h.id(w, r, errColorNotFound)
	if !ok {
		return
	}
	if err := h.svc.DeleteColor(r.Context(), h.actor(r), id, r.URL.Query().Get("reason")); err != nil {
		h.fail(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) putImage(w http.ResponseWriter, r *http.Request) {
	id, ok := h.id(w, r, errColorNotFound)
	if !ok {
		return
	}
	file, err := readMultipart(w, r, "file", nil)
	if err != nil {
		h.fail(w, r, err)
		return
	}
	color, err := h.svc.PutImage(r.Context(), h.actor(r), id, chi.URLParam(r, "viewpoint"), file)
	if err != nil {
		h.fail(w, r, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, color)
}

func (h *Handler) deleteImage(w http.ResponseWriter, r *http.Request) {
	id, ok := h.id(w, r, errColorNotFound)
	if !ok {
		return
	}
	color, err := h.svc.DeleteImage(r.Context(), h.actor(r), id, chi.URLParam(r, "viewpoint"))
	if err != nil {
		h.fail(w, r, err)
		return
	}
	httpx.WriteJSON(w, http.StatusOK, color)
}
