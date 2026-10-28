package catalog

import (
	"context"
	"endosoflow/internal/adapters/storage"
	"endosoflow/internal/audit"
	"endosoflow/internal/auth"
	"endosoflow/internal/platform/apperr"
	"endosoflow/internal/platform/database"
	"endosoflow/internal/platform/ids"
	"endosoflow/internal/storagecleanup"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

var (
	errForbidden        = apperr.Forbidden("FORBIDDEN", "No tiene permiso para realizar esta acción.")
	errVersionRequired  = apperr.BadRequest("VERSION_REQUIRED", "Falta la versión del registro.")
	errVersionConflict  = apperr.Conflict("VERSION_CONFLICT", "Otro usuario modificó este registro. Recargue e intente nuevamente.")
	errModelNotFound    = apperr.NotFound("MODEL_NOT_FOUND", "El modelo no existe.")
	errVersionNotFound  = apperr.NotFound("VERSION_NOT_FOUND", "La versión no existe.")
	errColorNotFound    = apperr.NotFound("COLOR_NOT_FOUND", "El color no existe.")
	errImageNotFound    = apperr.NotFound("IMAGE_NOT_FOUND", "El color no tiene imagen en esa vista.")
	errAlreadyArchived  = apperr.Conflict("CATALOG_ENTRY_ALREADY_ARCHIVED", "El registro ya está archivado.")
	errAlreadyActive    = apperr.Conflict("CATALOG_ENTRY_ALREADY_ACTIVE", "El registro ya está activo.")
	errLastVersion      = apperr.Conflict("LAST_ACTIVE_VERSION", "Un modelo activo necesita al menos una versión activa. Archive el modelo o active otra versión primero.")
	errLastColor        = apperr.Conflict("LAST_ACTIVE_COLOR", "Un modelo activo necesita al menos un color activo. Archive el modelo o active otro color primero.")
	errMainImage        = apperr.Unprocessable("MAIN_IMAGE_REQUIRED", "La vista principal no se puede quitar; solo se puede reemplazar.")
	errStorageDown      = apperr.New(http.StatusServiceUnavailable, "STORAGE_UNAVAILABLE", "No se pudo guardar la imagen. Intente nuevamente en unos minutos.")
	errReasonRequired   = apperr.Unprocessable("REASON_REQUIRED", "Debe escribir el motivo.").WithFields(apperr.FieldError{Field: "reason", Code: "REQUIRED", Message: "El motivo es obligatorio."})
	errViewpointInvalid = apperr.Unprocessable("VALIDATION_FAILED", "Revise los datos ingresados.").WithFields(apperr.FieldError{Field: "viewpoint", Code: "INVALID_VALUE", Message: "La vista debe ser main_view, exterior_front, exterior_left, exterior_right, exterior_rear o interior."})
)

func inUse(what string) *apperr.Error {
	return apperr.Conflict("CATALOG_ENTRY_IN_USE", "No se puede eliminar: hay ventas que usan "+what+". Archívelo en su lugar.")
}

// Deps are the service's dependencies.
type Deps struct {
	DB     auth.Database
	Store  storage.Store
	Logger *slog.Logger
	Now    func() time.Time // nil means time.Now
}

// Service implements the catalog use cases.
type Service struct {
	db     auth.Database
	store  storage.Store
	logger *slog.Logger
	now    func() time.Time
}

// NewService builds the service.
func NewService(d Deps) *Service {
	s := &Service{db: d.DB, store: d.Store, logger: d.Logger, now: d.Now}
	if s.now == nil {
		s.now = time.Now
	}
	if s.store == nil {
		s.store = storage.Unconfigured()
	}
	return s
}

func isStaff(a auth.Actor) bool {
	return a.Role == auth.RoleSystemAdmin || a.Role == auth.RoleSalesManager || a.Role == auth.RoleSalesAdvisor
}

func isManagement(a auth.Actor) bool {
	return a.Role == auth.RoleSystemAdmin || a.Role == auth.RoleSalesManager
}

func requireStaff(a auth.Actor) error {
	if !isStaff(a) {
		return errForbidden
	}
	return nil
}

func requireManagement(a auth.Actor) error {
	if !isManagement(a) {
		return errForbidden
	}
	return nil
}

func requireAdmin(a auth.Actor) error {
	if a.Role != auth.RoleSystemAdmin {
		return errForbidden
	}
	return nil
}

// --- reading ---

func (s *Service) buildColor(row colorRow, images []imageRow) Color {
	c := Color{
		ID: row.ID, ModelID: row.ModelID, Name: row.Name, IsActive: row.IsActive, Images: []Image{},
		Version: row.Version, CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt,
	}
	for _, i := range images {
		c.Images = append(c.Images, Image{
			ID: i.ID, Viewpoint: i.Viewpoint, URL: s.store.PublicURL(i.Key),
			MimeType: i.MimeType, SizeBytes: i.SizeBytes, UpdatedAt: i.UpdatedAt,
		})
		if i.Viewpoint == MainView {
			c.MainImageURL = s.store.PublicURL(i.Key)
		}
	}
	return c
}

// loadModel reads a model with its categories, versions and colors. activeOnly is what Advisors get: an
// archived model does not exist for them, and archived versions and colors are left out.
func (s *Service) loadModel(ctx context.Context, q querier, id uuid.UUID, activeOnly bool) (*Model, error) {
	row, err := findModelRow(ctx, q, id, false)
	if err != nil {
		return nil, err
	}
	if row == nil || (activeOnly && !row.IsActive) {
		return nil, errModelNotFound
	}
	cats, err := modelCategories(ctx, q, id)
	if err != nil {
		return nil, err
	}
	versions, err := modelVersions(ctx, q, id, activeOnly)
	if err != nil {
		return nil, err
	}
	colorRows, err := modelColorRows(ctx, q, id, activeOnly)
	if err != nil {
		return nil, err
	}
	colorIDs := make([]uuid.UUID, len(colorRows))
	for i, c := range colorRows {
		colorIDs[i] = c.ID
	}
	images, err := colorImages(ctx, q, colorIDs)
	if err != nil {
		return nil, err
	}
	colors := make([]Color, 0, len(colorRows))
	for _, c := range colorRows {
		colors = append(colors, s.buildColor(c, images[c.ID]))
	}
	return &Model{
		ID: row.ID, Name: row.Name, Description: row.Description, Categories: cats, IsActive: row.IsActive,
		Versions: versions, Colors: colors, Version: row.Version, CreatedAt: row.CreatedAt, UpdatedAt: row.UpdatedAt,
	}, nil
}

func (s *Service) loadColor(ctx context.Context, q querier, id uuid.UUID) (*Color, error) {
	row, err := findColorRow(ctx, q, id, false)
	if err != nil {
		return nil, err
	}
	if row == nil {
		return nil, errColorNotFound
	}
	images, err := colorImages(ctx, q, []uuid.UUID{id})
	if err != nil {
		return nil, err
	}
	c := s.buildColor(*row, images[id])
	return &c, nil
}

// List returns one page of models. Advisors only get active ones.
func (s *Service) List(ctx context.Context, actor auth.Actor, f ModelFilter) (*ModelList, error) {
	if err := requireStaff(actor); err != nil {
		return nil, err
	}
	if !isManagement(actor) {
		f.Status = "active"
	}
	if f.Page < 1 {
		f.Page = 1
	}
	if f.PageSize < 1 {
		f.PageSize = 20
	}
	if f.PageSize > 100 {
		f.PageSize = 100
	}
	items, total, err := listModels(ctx, s.db, f, s.store.PublicURL)
	if err != nil {
		return nil, err
	}
	return &ModelList{Items: items, Page: f.Page, PageSize: f.PageSize, Total: total}, nil
}

// Get returns one model. An Advisor gets it only while it is active, and without archived entries.
func (s *Service) Get(ctx context.Context, actor auth.Actor, id uuid.UUID) (*Model, error) {
	if err := requireStaff(actor); err != nil {
		return nil, err
	}
	return s.loadModel(ctx, s.db, id, !isManagement(actor))
}

// Selectable returns what the sale form offers.
func (s *Service) Selectable(ctx context.Context, actor auth.Actor) ([]Selectable, error) {
	if err := requireStaff(actor); err != nil {
		return nil, err
	}
	return selectableModels(ctx, s.db, s.store.PublicURL)
}

// --- models ---

func imageKey(colorID uuid.UUID, viewpoint, imageID, ext string) string {
	return fmt.Sprintf("catalog/colors/%s/%s-%s.%s", colorID, strings.ReplaceAll(viewpoint, "_", "-"), imageID, ext)
}

// putObject stores a new image object. The object goes in before the transaction so that a committed row
// always points at a file that exists; if the transaction then fails, discard removes it again.
func (s *Service) putObject(ctx context.Context, key string, img *imageFile) (discard func(), err error) {
	if err := s.store.Put(ctx, key, img.MimeType, img.Data); err != nil {
		s.logger.Error("could not store a catalog image", "key", key, "error", err)
		return nil, errStorageDown
	}
	return func() {
		if err := s.store.Delete(context.WithoutCancel(ctx), key); err != nil {
			s.logger.Warn("could not remove an image after a failed save; it is orphaned", "key", key, "error", err)
		}
	}, nil
}

// CreateModel creates a model with its first version, its first color and that color's Main view image, all
// at once: a model cannot exist without them.
func (s *Service) CreateModel(ctx context.Context, actor auth.Actor, in CreateModelInput, image []byte) (*Model, error) {
	if err := requireManagement(actor); err != nil {
		return nil, err
	}
	data, v := validateModel(in.Name, in.Description, in.Categories)
	versionName := v.name("version.name", "El nombre de la versión", in.Version.Name, 80)
	cents := v.price("version.referencePrice", in.Version.ReferencePrice)
	colorName := v.name("color.name", "El nombre del color", in.Color.Name, 60)
	if problem := v.result(); problem != nil {
		return nil, problem
	}
	img, problem := checkImage(image)
	if problem != nil {
		return nil, problem
	}

	now := s.now()
	modelID, versionID, colorID, imageID := ids.New(), ids.New(), ids.New(), ids.New()
	key := imageKey(colorID, MainView, imageID.String(), img.Extension)
	discard, err := s.putObject(ctx, key, img)
	if err != nil {
		return nil, err
	}

	err = database.WithTx(ctx, s.db, func(tx pgx.Tx) error {
		if err := insertModel(ctx, tx, modelID, data, actor.ID, now); err != nil {
			return err
		}
		if err := insertVersion(ctx, tx, versionID, modelID, versionName, cents, actor.ID, now); err != nil {
			return err
		}
		if err := insertColor(ctx, tx, colorID, modelID, colorName, actor.ID, now); err != nil {
			return err
		}
		if err := insertImage(ctx, tx, imageID, colorID, MainView, img, key, actor.ID, now); err != nil {
			return err
		}
		events := []audit.Event{
			{
				EntityType: audit.EntityVehicleModel, EntityID: modelID, Action: audit.ActionCreated,
				Changes: map[string]any{"name": data.Name, "categories": data.Categories},
			},
			{
				EntityType: audit.EntityVehicleVersion, EntityID: versionID, Action: audit.ActionCreated,
				Changes: map[string]any{"name": versionName, "referencePrice": formatCents(cents)},
			},
			{
				EntityType: audit.EntityVehicleColor, EntityID: colorID, Action: audit.ActionCreated,
				Changes: map[string]any{"name": colorName},
			},
			{
				EntityType: audit.EntityCatalogImage, EntityID: imageID, Action: audit.ActionUploaded,
				Changes: map[string]any{"viewpoint": MainView, "mimeType": img.MimeType, "sizeBytes": len(img.Data)},
			},
		}
		for _, e := range events {
			e.ActorID = &actor.ID
			if err := audit.Record(ctx, tx, e, now); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		discard()
		return nil, apperr.FromError(err)
	}
	return s.loadModel(ctx, s.db, modelID, false)
}

func (s *Service) recordAudit(ctx context.Context, tx pgx.Tx, actor auth.Actor, entity string, id uuid.UUID, action string, now time.Time, changes map[string]any) error {
	return audit.Record(ctx, tx, audit.Event{ActorID: &actor.ID, EntityType: entity, EntityID: id, Action: action, Changes: changes}, now)
}

// UpdateModel changes a model's name, description or categories.
func (s *Service) UpdateModel(ctx context.Context, actor auth.Actor, id uuid.UUID, in UpdateModelInput) (*Model, error) {
	if err := requireManagement(actor); err != nil {
		return nil, err
	}
	if in.Version == nil {
		return nil, errVersionRequired
	}
	now := s.now()
	err := database.WithTx(ctx, s.db, func(tx pgx.Tx) error {
		row, err := findModelRow(ctx, tx, id, true)
		if err != nil {
			return err
		}
		if row == nil {
			return errModelNotFound
		}
		if row.Version != *in.Version {
			return errVersionConflict
		}
		oldCats, err := modelCategories(ctx, tx, id)
		if err != nil {
			return err
		}
		name, description, cats := row.Name, "", oldCats
		if row.Description != nil {
			description = *row.Description
		}
		if in.Name != nil {
			name = *in.Name
		}
		if in.Description != nil {
			description = *in.Description
		}
		if in.Categories != nil {
			cats = *in.Categories
		}
		data, v := validateModel(name, description, cats)
		if problem := v.result(); problem != nil {
			return problem
		}
		changed, err := updateModel(ctx, tx, id, *in.Version, data, actor.ID, now)
		if err != nil {
			return err
		}
		if !changed {
			return errVersionConflict
		}
		changes := map[string]any{}
		if data.Name != row.Name {
			changes["name"] = map[string]string{"before": row.Name, "after": data.Name}
		}
		if (data.Description == nil) != (row.Description == nil) || (data.Description != nil && *data.Description != *row.Description) {
			changes["description"] = "changed"
		}
		if in.Categories != nil && strings.Join(data.Categories, ",") != strings.Join(oldCats, ",") {
			if err := replaceCategories(ctx, tx, id, data.Categories); err != nil {
				return err
			}
			changes["categories"] = map[string][]string{"before": oldCats, "after": data.Categories}
		}
		if len(changes) > 0 {
			return s.recordAudit(ctx, tx, actor, audit.EntityVehicleModel, id, audit.ActionUpdated, now, changes)
		}
		return nil
	})
	if err != nil {
		return nil, apperr.FromError(err)
	}
	return s.loadModel(ctx, s.db, id, false)
}

func (s *Service) setModelState(ctx context.Context, actor auth.Actor, id uuid.UUID, active bool) (*Model, error) {
	if err := requireManagement(actor); err != nil {
		return nil, err
	}
	now := s.now()
	err := database.WithTx(ctx, s.db, func(tx pgx.Tx) error {
		row, err := findModelRow(ctx, tx, id, true)
		if err != nil {
			return err
		}
		if row == nil {
			return errModelNotFound
		}
		if row.IsActive == active {
			if active {
				return errAlreadyActive
			}
			return errAlreadyArchived
		}
		if err := setModelActive(ctx, tx, id, active, actor.ID, now); err != nil {
			return err
		}
		action := audit.ActionDeactivated
		if active {
			action = audit.ActionReactivated
		}
		return s.recordAudit(ctx, tx, actor, audit.EntityVehicleModel, id, action, now, nil)
	})
	if err != nil {
		return nil, apperr.FromError(err)
	}
	return s.loadModel(ctx, s.db, id, false)
}

// ArchiveModel hides a model, and so its versions and colors, from selection. Existing sales are unaffected.
func (s *Service) ArchiveModel(ctx context.Context, actor auth.Actor, id uuid.UUID) (*Model, error) {
	return s.setModelState(ctx, actor, id, false)
}

// UnarchiveModel makes a model selectable again. It must still have an active version and color.
func (s *Service) UnarchiveModel(ctx context.Context, actor auth.Actor, id uuid.UUID) (*Model, error) {
	return s.setModelState(ctx, actor, id, true)
}

// --- versions ---

// CreateVersion adds a version to a model.
func (s *Service) CreateVersion(ctx context.Context, actor auth.Actor, modelID uuid.UUID, in VersionInput) (*Version, error) {
	if err := requireManagement(actor); err != nil {
		return nil, err
	}
	v := &validator{}
	name := v.name("name", "El nombre de la versión", in.Name, 80)
	cents := v.price("referencePrice", in.ReferencePrice)
	if problem := v.result(); problem != nil {
		return nil, problem
	}
	now := s.now()
	id := ids.New()
	err := database.WithTx(ctx, s.db, func(tx pgx.Tx) error {
		row, err := findModelRow(ctx, tx, modelID, true)
		if err != nil {
			return err
		}
		if row == nil {
			return errModelNotFound
		}
		if err := insertVersion(ctx, tx, id, modelID, name, cents, actor.ID, now); err != nil {
			return err
		}
		return s.recordAudit(ctx, tx, actor, audit.EntityVehicleVersion, id, audit.ActionCreated, now,
			map[string]any{"modelId": modelID, "name": name, "referencePrice": formatCents(cents)})
	})
	if err != nil {
		return nil, apperr.FromError(err)
	}
	return findVersion(ctx, s.db, id, false)
}

// UpdateVersion changes a version's name or reference price. Existing sales keep the price they were made at.
func (s *Service) UpdateVersion(ctx context.Context, actor auth.Actor, id uuid.UUID, in UpdateVersionInput) (*Version, error) {
	if err := requireManagement(actor); err != nil {
		return nil, err
	}
	if in.Version == nil {
		return nil, errVersionRequired
	}
	now := s.now()
	err := database.WithTx(ctx, s.db, func(tx pgx.Tx) error {
		current, err := findVersion(ctx, tx, id, true)
		if err != nil {
			return err
		}
		if current == nil {
			return errVersionNotFound
		}
		if current.Version != *in.Version {
			return errVersionConflict
		}
		v := &validator{}
		name := current.Name
		if in.Name != nil {
			name = *in.Name
		}
		name = v.name("name", "El nombre de la versión", name, 80)
		oldCents, _ := parsePrice(current.ReferencePrice)
		cents := oldCents
		if in.ReferencePrice != nil {
			cents = v.price("referencePrice", *in.ReferencePrice)
		}
		if problem := v.result(); problem != nil {
			return problem
		}
		changed, err := updateVersion(ctx, tx, id, *in.Version, name, cents, actor.ID, now)
		if err != nil {
			return err
		}
		if !changed {
			return errVersionConflict
		}
		changes := map[string]any{}
		if name != current.Name {
			changes["name"] = map[string]string{"before": current.Name, "after": name}
		}
		if cents != oldCents {
			changes["referencePrice"] = map[string]string{"before": formatCents(oldCents), "after": formatCents(cents)}
		}
		if len(changes) > 0 {
			return s.recordAudit(ctx, tx, actor, audit.EntityVehicleVersion, id, audit.ActionUpdated, now, changes)
		}
		return nil
	})
	if err != nil {
		return nil, apperr.FromError(err)
	}
	return findVersion(ctx, s.db, id, false)
}

func (s *Service) setVersionState(ctx context.Context, actor auth.Actor, id uuid.UUID, active bool) (*Version, error) {
	if err := requireManagement(actor); err != nil {
		return nil, err
	}
	now := s.now()
	err := database.WithTx(ctx, s.db, func(tx pgx.Tx) error {
		peek, err := findVersion(ctx, tx, id, false)
		if err != nil {
			return err
		}
		if peek == nil {
			return errVersionNotFound
		}
		// Lock the model first so two simultaneous archives cannot both take the last active version.
		model, err := findModelRow(ctx, tx, peek.ModelID, true)
		if err != nil {
			return err
		}
		current, err := findVersion(ctx, tx, id, true)
		if err != nil {
			return err
		}
		if current == nil {
			return errVersionNotFound
		}
		if current.IsActive == active {
			if active {
				return errAlreadyActive
			}
			return errAlreadyArchived
		}
		if !active && model.IsActive {
			others, err := countActiveVersions(ctx, tx, current.ModelID, id)
			if err != nil {
				return err
			}
			if others == 0 {
				return errLastVersion
			}
		}
		if err := setVersionActive(ctx, tx, id, active, actor.ID, now); err != nil {
			return err
		}
		action := audit.ActionDeactivated
		if active {
			action = audit.ActionReactivated
		}
		return s.recordAudit(ctx, tx, actor, audit.EntityVehicleVersion, id, action, now, nil)
	})
	if err != nil {
		return nil, apperr.FromError(err)
	}
	return findVersion(ctx, s.db, id, false)
}

// ArchiveVersion makes a version unselectable. The last active version of an active model cannot be archived.
func (s *Service) ArchiveVersion(ctx context.Context, actor auth.Actor, id uuid.UUID) (*Version, error) {
	return s.setVersionState(ctx, actor, id, false)
}

// UnarchiveVersion makes a version selectable again.
func (s *Service) UnarchiveVersion(ctx context.Context, actor auth.Actor, id uuid.UUID) (*Version, error) {
	return s.setVersionState(ctx, actor, id, true)
}

// --- colors ---

// CreateColor adds a color with its Main view image: a color cannot exist without one.
func (s *Service) CreateColor(ctx context.Context, actor auth.Actor, modelID uuid.UUID, in ColorInput, image []byte) (*Color, error) {
	if err := requireManagement(actor); err != nil {
		return nil, err
	}
	v := &validator{}
	name := v.name("name", "El nombre del color", in.Name, 60)
	if problem := v.result(); problem != nil {
		return nil, problem
	}
	img, problem := checkImage(image)
	if problem != nil {
		return nil, problem
	}
	now := s.now()
	colorID, imageID := ids.New(), ids.New()
	key := imageKey(colorID, MainView, imageID.String(), img.Extension)
	discard, err := s.putObject(ctx, key, img)
	if err != nil {
		return nil, err
	}
	err = database.WithTx(ctx, s.db, func(tx pgx.Tx) error {
		row, err := findModelRow(ctx, tx, modelID, true)
		if err != nil {
			return err
		}
		if row == nil {
			return errModelNotFound
		}
		if err := insertColor(ctx, tx, colorID, modelID, name, actor.ID, now); err != nil {
			return err
		}
		if err := insertImage(ctx, tx, imageID, colorID, MainView, img, key, actor.ID, now); err != nil {
			return err
		}
		if err := s.recordAudit(ctx, tx, actor, audit.EntityVehicleColor, colorID, audit.ActionCreated, now,
			map[string]any{"modelId": modelID, "name": name}); err != nil {
			return err
		}
		return s.recordAudit(ctx, tx, actor, audit.EntityCatalogImage, imageID, audit.ActionUploaded, now,
			map[string]any{"viewpoint": MainView, "mimeType": img.MimeType, "sizeBytes": len(img.Data)})
	})
	if err != nil {
		discard()
		return nil, apperr.FromError(err)
	}
	return s.loadColor(ctx, s.db, colorID)
}

// UpdateColor renames a color.
func (s *Service) UpdateColor(ctx context.Context, actor auth.Actor, id uuid.UUID, in UpdateColorInput) (*Color, error) {
	if err := requireManagement(actor); err != nil {
		return nil, err
	}
	if in.Version == nil {
		return nil, errVersionRequired
	}
	now := s.now()
	err := database.WithTx(ctx, s.db, func(tx pgx.Tx) error {
		current, err := findColorRow(ctx, tx, id, true)
		if err != nil {
			return err
		}
		if current == nil {
			return errColorNotFound
		}
		if current.Version != *in.Version {
			return errVersionConflict
		}
		v := &validator{}
		name := current.Name
		if in.Name != nil {
			name = *in.Name
		}
		name = v.name("name", "El nombre del color", name, 60)
		if problem := v.result(); problem != nil {
			return problem
		}
		changed, err := updateColor(ctx, tx, id, *in.Version, name, actor.ID, now)
		if err != nil {
			return err
		}
		if !changed {
			return errVersionConflict
		}
		if name != current.Name {
			return s.recordAudit(ctx, tx, actor, audit.EntityVehicleColor, id, audit.ActionUpdated, now,
				map[string]any{"name": map[string]string{"before": current.Name, "after": name}})
		}
		return nil
	})
	if err != nil {
		return nil, apperr.FromError(err)
	}
	return s.loadColor(ctx, s.db, id)
}

func (s *Service) setColorState(ctx context.Context, actor auth.Actor, id uuid.UUID, active bool) (*Color, error) {
	if err := requireManagement(actor); err != nil {
		return nil, err
	}
	now := s.now()
	err := database.WithTx(ctx, s.db, func(tx pgx.Tx) error {
		peek, err := findColorRow(ctx, tx, id, false)
		if err != nil {
			return err
		}
		if peek == nil {
			return errColorNotFound
		}
		model, err := findModelRow(ctx, tx, peek.ModelID, true)
		if err != nil {
			return err
		}
		current, err := findColorRow(ctx, tx, id, true)
		if err != nil {
			return err
		}
		if current == nil {
			return errColorNotFound
		}
		if current.IsActive == active {
			if active {
				return errAlreadyActive
			}
			return errAlreadyArchived
		}
		if !active && model.IsActive {
			others, err := countActiveColors(ctx, tx, current.ModelID, id)
			if err != nil {
				return err
			}
			if others == 0 {
				return errLastColor
			}
		}
		if err := setColorActive(ctx, tx, id, active, actor.ID, now); err != nil {
			return err
		}
		action := audit.ActionDeactivated
		if active {
			action = audit.ActionReactivated
		}
		return s.recordAudit(ctx, tx, actor, audit.EntityVehicleColor, id, action, now, nil)
	})
	if err != nil {
		return nil, apperr.FromError(err)
	}
	return s.loadColor(ctx, s.db, id)
}

// ArchiveColor makes a color unselectable. The last active color of an active model cannot be archived.
func (s *Service) ArchiveColor(ctx context.Context, actor auth.Actor, id uuid.UUID) (*Color, error) {
	return s.setColorState(ctx, actor, id, false)
}

// UnarchiveColor makes a color selectable again.
func (s *Service) UnarchiveColor(ctx context.Context, actor auth.Actor, id uuid.UUID) (*Color, error) {
	return s.setColorState(ctx, actor, id, true)
}

// --- images ---

// PutImage adds or replaces the image of one viewpoint of a color. A replacement keeps one image per
// viewpoint: the row is updated to the new file and the old file is deleted after the commit.
func (s *Service) PutImage(ctx context.Context, actor auth.Actor, colorID uuid.UUID, viewpoint string, data []byte) (*Color, error) {
	if err := requireManagement(actor); err != nil {
		return nil, err
	}
	if !isViewpoint(viewpoint) {
		return nil, errViewpointInvalid
	}
	img, problem := checkImage(data)
	if problem != nil {
		return nil, problem
	}
	if row, err := findColorRow(ctx, s.db, colorID, false); err != nil {
		return nil, err
	} else if row == nil {
		return nil, errColorNotFound
	}

	now := s.now()
	imageID := ids.New()
	key := imageKey(colorID, viewpoint, imageID.String(), img.Extension)
	discard, err := s.putObject(ctx, key, img)
	if err != nil {
		return nil, err
	}

	var pending []storagecleanup.Pending
	err = database.WithTx(ctx, s.db, func(tx pgx.Tx) error {
		pending = nil
		if row, err := findColorRow(ctx, tx, colorID, true); err != nil {
			return err
		} else if row == nil {
			return errColorNotFound
		}
		existing, err := findImage(ctx, tx, colorID, viewpoint, true)
		if err != nil {
			return err
		}
		changes := map[string]any{"viewpoint": viewpoint, "mimeType": img.MimeType, "sizeBytes": len(img.Data)}
		if existing == nil {
			if err := insertImage(ctx, tx, imageID, colorID, viewpoint, img, key, actor.ID, now); err != nil {
				return err
			}
			return s.recordAudit(ctx, tx, actor, audit.EntityCatalogImage, imageID, audit.ActionUploaded, now, changes)
		}
		if err := replaceImage(ctx, tx, existing.ID, img, key, actor.ID, now); err != nil {
			return err
		}
		p, err := storagecleanup.Enqueue(ctx, tx, existing.Key, storagecleanup.CatalogImageReplaced)
		if err != nil {
			return err
		}
		pending = append(pending, p)
		return s.recordAudit(ctx, tx, actor, audit.EntityCatalogImage, existing.ID, audit.ActionReplaced, now, changes)
	})
	if err != nil {
		discard()
		return nil, apperr.FromError(err)
	}
	storagecleanup.Process(ctx, s.db, s.store, s.logger, pending...)
	return s.loadColor(ctx, s.db, colorID)
}

// DeleteImage removes an optional image. The Main view can only be replaced.
func (s *Service) DeleteImage(ctx context.Context, actor auth.Actor, colorID uuid.UUID, viewpoint string) (*Color, error) {
	if err := requireManagement(actor); err != nil {
		return nil, err
	}
	if !isViewpoint(viewpoint) {
		return nil, errViewpointInvalid
	}
	if viewpoint == MainView {
		return nil, errMainImage
	}
	now := s.now()
	var pending storagecleanup.Pending
	err := database.WithTx(ctx, s.db, func(tx pgx.Tx) error {
		if row, err := findColorRow(ctx, tx, colorID, true); err != nil {
			return err
		} else if row == nil {
			return errColorNotFound
		}
		existing, err := findImage(ctx, tx, colorID, viewpoint, true)
		if err != nil {
			return err
		}
		if existing == nil {
			return errImageNotFound
		}
		if err := deleteImage(ctx, tx, existing.ID); err != nil {
			return err
		}
		pending, err = storagecleanup.Enqueue(ctx, tx, existing.Key, storagecleanup.CatalogImageRemoved)
		if err != nil {
			return err
		}
		return s.recordAudit(ctx, tx, actor, audit.EntityCatalogImage, existing.ID, audit.ActionRemoved, now,
			map[string]any{"viewpoint": viewpoint})
	})
	if err != nil {
		return nil, apperr.FromError(err)
	}
	storagecleanup.Process(ctx, s.db, s.store, s.logger, pending)
	return s.loadColor(ctx, s.db, colorID)
}

// --- permanent deletion (Admin, exceptional) ---

func cleanReason(reason string) (string, error) {
	reason = strings.TrimSpace(reason)
	if reason == "" {
		return "", errReasonRequired
	}
	return reason, nil
}

// DeleteModel permanently removes a model that no sale uses, with its versions, colors and images.
func (s *Service) DeleteModel(ctx context.Context, actor auth.Actor, id uuid.UUID, reason string) error {
	if err := requireAdmin(actor); err != nil {
		return err
	}
	reason, err := cleanReason(reason)
	if err != nil {
		return err
	}
	now := s.now()
	var pending []storagecleanup.Pending
	err = database.WithTx(ctx, s.db, func(tx pgx.Tx) error {
		pending = nil
		row, err := findModelRow(ctx, tx, id, true)
		if err != nil {
			return err
		}
		if row == nil {
			return errModelNotFound
		}
		if used, err := saleReferences(ctx, tx, "model", id); err != nil {
			return err
		} else if used {
			return inUse("este modelo")
		}
		rows, err := tx.Query(ctx, `SELECT i.storage_key FROM catalog_images i JOIN vehicle_colors c ON c.id = i.vehicle_color_id WHERE c.model_id = $1`, id)
		if err != nil {
			return err
		}
		var keys []string
		for rows.Next() {
			var k string
			if err := rows.Scan(&k); err != nil {
				rows.Close()
				return err
			}
			keys = append(keys, k)
		}
		rows.Close()
		if err := rows.Err(); err != nil {
			return err
		}
		for _, stmt := range []string{
			`DELETE FROM catalog_images WHERE vehicle_color_id IN (SELECT id FROM vehicle_colors WHERE model_id = $1)`,
			`DELETE FROM vehicle_colors WHERE model_id = $1`,
			`DELETE FROM vehicle_versions WHERE model_id = $1`,
			`DELETE FROM vehicle_model_categories WHERE model_id = $1`,
			`DELETE FROM vehicle_models WHERE id = $1`,
		} {
			if _, err := tx.Exec(ctx, stmt, id); err != nil {
				return err
			}
		}
		for _, k := range keys {
			p, err := storagecleanup.Enqueue(ctx, tx, k, storagecleanup.CatalogImageRemoved)
			if err != nil {
				return err
			}
			pending = append(pending, p)
		}
		return audit.Record(ctx, tx, audit.Event{
			ActorID: &actor.ID, EntityType: audit.EntityVehicleModel, EntityID: id,
			Action: audit.ActionDeleted, Reason: reason, Changes: map[string]any{"name": row.Name},
		}, now)
	})
	if err != nil {
		return apperr.FromError(err)
	}
	storagecleanup.Process(ctx, s.db, s.store, s.logger, pending...)
	return nil
}

// DeleteVersion permanently removes a version that no sale uses.
func (s *Service) DeleteVersion(ctx context.Context, actor auth.Actor, id uuid.UUID, reason string) error {
	if err := requireAdmin(actor); err != nil {
		return err
	}
	reason, err := cleanReason(reason)
	if err != nil {
		return err
	}
	now := s.now()
	err = database.WithTx(ctx, s.db, func(tx pgx.Tx) error {
		peek, err := findVersion(ctx, tx, id, false)
		if err != nil {
			return err
		}
		if peek == nil {
			return errVersionNotFound
		}
		model, err := findModelRow(ctx, tx, peek.ModelID, true)
		if err != nil {
			return err
		}
		if used, err := saleReferences(ctx, tx, "version", id); err != nil {
			return err
		} else if used {
			return inUse("esta versión")
		}
		if peek.IsActive && model.IsActive {
			if others, err := countActiveVersions(ctx, tx, peek.ModelID, id); err != nil {
				return err
			} else if others == 0 {
				return errLastVersion
			}
		}
		if _, err := tx.Exec(ctx, `DELETE FROM vehicle_versions WHERE id = $1`, id); err != nil {
			return err
		}
		return audit.Record(ctx, tx, audit.Event{
			ActorID: &actor.ID, EntityType: audit.EntityVehicleVersion, EntityID: id,
			Action: audit.ActionDeleted, Reason: reason, Changes: map[string]any{"name": peek.Name, "modelId": peek.ModelID},
		}, now)
	})
	if err != nil {
		return apperr.FromError(err)
	}
	return nil
}

// DeleteColor permanently removes a color that no sale uses, with its images.
func (s *Service) DeleteColor(ctx context.Context, actor auth.Actor, id uuid.UUID, reason string) error {
	if err := requireAdmin(actor); err != nil {
		return err
	}
	reason, err := cleanReason(reason)
	if err != nil {
		return err
	}
	now := s.now()
	var pending []storagecleanup.Pending
	err = database.WithTx(ctx, s.db, func(tx pgx.Tx) error {
		pending = nil
		peek, err := findColorRow(ctx, tx, id, false)
		if err != nil {
			return err
		}
		if peek == nil {
			return errColorNotFound
		}
		model, err := findModelRow(ctx, tx, peek.ModelID, true)
		if err != nil {
			return err
		}
		if used, err := saleReferences(ctx, tx, "color", id); err != nil {
			return err
		} else if used {
			return inUse("este color")
		}
		if peek.IsActive && model.IsActive {
			if others, err := countActiveColors(ctx, tx, peek.ModelID, id); err != nil {
				return err
			} else if others == 0 {
				return errLastColor
			}
		}
		images, err := colorImages(ctx, tx, []uuid.UUID{id})
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `DELETE FROM catalog_images WHERE vehicle_color_id = $1`, id); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `DELETE FROM vehicle_colors WHERE id = $1`, id); err != nil {
			return err
		}
		for _, img := range images[id] {
			p, err := storagecleanup.Enqueue(ctx, tx, img.Key, storagecleanup.CatalogImageRemoved)
			if err != nil {
				return err
			}
			pending = append(pending, p)
		}
		return audit.Record(ctx, tx, audit.Event{
			ActorID: &actor.ID, EntityType: audit.EntityVehicleColor, EntityID: id,
			Action: audit.ActionDeleted, Reason: reason, Changes: map[string]any{"name": peek.Name, "modelId": peek.ModelID},
		}, now)
	})
	if err != nil {
		return apperr.FromError(err)
	}
	storagecleanup.Process(ctx, s.db, s.store, s.logger, pending...)
	return nil
}
