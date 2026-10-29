package catalog

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type querier interface {
	Exec(ctx context.Context, sql string, arguments ...any) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// --- models ---

type modelRow struct {
	ID          uuid.UUID
	Name        string
	Description *string
	IsActive    bool
	Version     int
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

func findModelRow(ctx context.Context, q querier, id uuid.UUID, forUpdate bool) (*modelRow, error) {
	sql := `SELECT id, model_name, description, is_active, row_version, created_at, updated_at
		FROM vehicle_models WHERE id = $1`
	if forUpdate {
		sql += ` FOR UPDATE`
	}
	var m modelRow
	err := q.QueryRow(ctx, sql, id).Scan(&m.ID, &m.Name, &m.Description, &m.IsActive, &m.Version, &m.CreatedAt, &m.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return &m, err
}

func modelCategories(ctx context.Context, q querier, id uuid.UUID) ([]string, error) {
	rows, err := q.Query(ctx, `SELECT category::text FROM vehicle_model_categories WHERE model_id = $1 ORDER BY vehicle_model_categories.category`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []string{}
	for rows.Next() {
		var c string
		if err := rows.Scan(&c); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func insertModel(ctx context.Context, q querier, id uuid.UUID, d modelData, actor uuid.UUID, now time.Time) error {
	if _, err := q.Exec(ctx, `INSERT INTO vehicle_models (id, model_name, description, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $5)`, id, d.Name, d.Description, actor, now); err != nil {
		return err
	}
	return replaceCategories(ctx, q, id, d.Categories)
}

func replaceCategories(ctx context.Context, q querier, id uuid.UUID, cats []string) error {
	if _, err := q.Exec(ctx, `DELETE FROM vehicle_model_categories WHERE model_id = $1`, id); err != nil {
		return err
	}
	for _, c := range cats {
		if _, err := q.Exec(ctx, `INSERT INTO vehicle_model_categories (model_id, category) VALUES ($1, $2::text::vehicle_category)`, id, c); err != nil {
			return err
		}
	}
	return nil
}

func updateModel(ctx context.Context, q querier, id uuid.UUID, version int, d modelData, actor uuid.UUID, now time.Time) (bool, error) {
	tag, err := q.Exec(ctx, `UPDATE vehicle_models SET model_name = $3, description = $4, updated_by = $5, updated_at = $6,
			row_version = row_version + 1 WHERE id = $1 AND row_version = $2`, id, version, d.Name, d.Description, actor, now)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() == 1, nil
}

func setModelActive(ctx context.Context, q querier, id uuid.UUID, active bool, actor uuid.UUID, now time.Time) error {
	var at *time.Time
	var by *uuid.UUID
	if !active {
		at, by = &now, &actor
	}
	_, err := q.Exec(ctx, `UPDATE vehicle_models SET is_active = $2, deactivated_at = $3, deactivated_by = $4,
		updated_by = $5, updated_at = $6, row_version = row_version + 1 WHERE id = $1`, id, active, at, by, actor, now)
	return err
}

// --- versions ---

const versionColumns = `id, model_id, version_name, reference_price::text, is_active, row_version, created_at, updated_at`

func scanVersion(row pgx.Row) (*Version, error) {
	var v Version
	err := row.Scan(&v.ID, &v.ModelID, &v.Name, &v.ReferencePrice, &v.IsActive, &v.Version, &v.CreatedAt, &v.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &v, nil
}

func findVersion(ctx context.Context, q querier, id uuid.UUID, forUpdate bool) (*Version, error) {
	sql := `SELECT ` + versionColumns + ` FROM vehicle_versions WHERE id = $1`
	if forUpdate {
		sql += ` FOR UPDATE`
	}
	v, err := scanVersion(q.QueryRow(ctx, sql, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return v, err
}

func modelVersions(ctx context.Context, q querier, modelID uuid.UUID, activeOnly bool) ([]Version, error) {
	sql := `SELECT ` + versionColumns + ` FROM vehicle_versions WHERE model_id = $1`
	if activeOnly {
		sql += ` AND is_active`
	}
	rows, err := q.Query(ctx, sql+` ORDER BY reference_price, lower(version_name)`, modelID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Version{}
	for rows.Next() {
		v, err := scanVersion(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *v)
	}
	return out, rows.Err()
}

func insertVersion(ctx context.Context, q querier, id, modelID uuid.UUID, name string, cents int64, actor uuid.UUID, now time.Time) error {
	_, err := q.Exec(ctx, `INSERT INTO vehicle_versions (id, model_id, version_name, reference_price, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4::numeric, $5, $6, $6)`, id, modelID, name, formatCents(cents), actor, now)
	return err
}

func updateVersion(ctx context.Context, q querier, id uuid.UUID, version int, name string, cents int64, actor uuid.UUID, now time.Time) (bool, error) {
	tag, err := q.Exec(ctx, `UPDATE vehicle_versions SET version_name = $3, reference_price = $4::numeric, updated_by = $5,
		updated_at = $6, row_version = row_version + 1 WHERE id = $1 AND row_version = $2`,
		id, version, name, formatCents(cents), actor, now)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() == 1, nil
}

func setVersionActive(ctx context.Context, q querier, id uuid.UUID, active bool, actor uuid.UUID, now time.Time) error {
	var at *time.Time
	var by *uuid.UUID
	if !active {
		at, by = &now, &actor
	}
	_, err := q.Exec(ctx, `UPDATE vehicle_versions SET is_active = $2, deactivated_at = $3, deactivated_by = $4,
		updated_by = $5, updated_at = $6, row_version = row_version + 1 WHERE id = $1`, id, active, at, by, actor, now)
	return err
}

func countActiveVersions(ctx context.Context, q querier, modelID uuid.UUID, except uuid.UUID) (int, error) {
	var n int
	err := q.QueryRow(ctx, `SELECT count(*) FROM vehicle_versions WHERE model_id = $1 AND is_active AND id <> $2`, modelID, except).Scan(&n)
	return n, err
}

// --- colors and images ---

type colorRow struct {
	ID        uuid.UUID
	ModelID   uuid.UUID
	Name      string
	IsActive  bool
	Version   int
	CreatedAt time.Time
	UpdatedAt time.Time
}

const colorColumns = `id, model_id, color_name, is_active, row_version, created_at, updated_at`

func scanColor(row pgx.Row) (*colorRow, error) {
	var c colorRow
	err := row.Scan(&c.ID, &c.ModelID, &c.Name, &c.IsActive, &c.Version, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func findColorRow(ctx context.Context, q querier, id uuid.UUID, forUpdate bool) (*colorRow, error) {
	sql := `SELECT ` + colorColumns + ` FROM vehicle_colors WHERE id = $1`
	if forUpdate {
		sql += ` FOR UPDATE`
	}
	c, err := scanColor(q.QueryRow(ctx, sql, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return c, err
}

func modelColorRows(ctx context.Context, q querier, modelID uuid.UUID, activeOnly bool) ([]colorRow, error) {
	sql := `SELECT ` + colorColumns + ` FROM vehicle_colors WHERE model_id = $1`
	if activeOnly {
		sql += ` AND is_active`
	}
	rows, err := q.Query(ctx, sql+` ORDER BY lower(color_name)`, modelID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []colorRow{}
	for rows.Next() {
		c, err := scanColor(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *c)
	}
	return out, rows.Err()
}

type imageRow struct {
	ID        uuid.UUID
	ColorID   uuid.UUID
	Viewpoint string
	MimeType  string
	SizeBytes int
	Key       string
	UpdatedAt time.Time
}

const imageColumns = `id, vehicle_color_id, viewpoint::text, mime_type, size_bytes, storage_key, updated_at`

func scanImage(row pgx.Row) (*imageRow, error) {
	var i imageRow
	err := row.Scan(&i.ID, &i.ColorID, &i.Viewpoint, &i.MimeType, &i.SizeBytes, &i.Key, &i.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &i, nil
}

// colorImages returns the images of the given colors in the order of the viewpoint enum (Main view first).
// The ORDER BY names the table column on purpose: a bare "viewpoint" would match the text output column of
// the same name and sort alphabetically instead.
func colorImages(ctx context.Context, q querier, colorIDs []uuid.UUID) (map[uuid.UUID][]imageRow, error) {
	out := map[uuid.UUID][]imageRow{}
	if len(colorIDs) == 0 {
		return out, nil
	}
	rows, err := q.Query(ctx, `SELECT `+imageColumns+` FROM catalog_images WHERE vehicle_color_id = ANY($1) ORDER BY catalog_images.viewpoint`, colorIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		i, err := scanImage(rows)
		if err != nil {
			return nil, err
		}
		out[i.ColorID] = append(out[i.ColorID], *i)
	}
	return out, rows.Err()
}

func findImage(ctx context.Context, q querier, colorID uuid.UUID, viewpoint string, forUpdate bool) (*imageRow, error) {
	sql := `SELECT ` + imageColumns + ` FROM catalog_images WHERE vehicle_color_id = $1 AND viewpoint = $2::text::viewpoint`
	if forUpdate {
		sql += ` FOR UPDATE`
	}
	i, err := scanImage(q.QueryRow(ctx, sql, colorID, viewpoint))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	return i, err
}

func insertImage(ctx context.Context, q querier, id, colorID uuid.UUID, viewpoint string, img *imageFile, key string, actor uuid.UUID, now time.Time) error {
	_, err := q.Exec(ctx, `INSERT INTO catalog_images (id, vehicle_color_id, viewpoint, mime_type, size_bytes, storage_key, uploaded_by, uploaded_at, updated_at)
		VALUES ($1, $2, $3::text::viewpoint, $4, $5, $6, $7, $8, $8)`, id, colorID, viewpoint, img.MimeType, len(img.Data), key, actor, now)
	return err
}

func replaceImage(ctx context.Context, q querier, id uuid.UUID, img *imageFile, key string, actor uuid.UUID, now time.Time) error {
	_, err := q.Exec(ctx, `UPDATE catalog_images SET mime_type = $2, size_bytes = $3, storage_key = $4, updated_by = $5, updated_at = $6
		WHERE id = $1`, id, img.MimeType, len(img.Data), key, actor, now)
	return err
}

func deleteImage(ctx context.Context, q querier, id uuid.UUID) error {
	_, err := q.Exec(ctx, `DELETE FROM catalog_images WHERE id = $1`, id)
	return err
}

func insertColor(ctx context.Context, q querier, id, modelID uuid.UUID, name string, actor uuid.UUID, now time.Time) error {
	_, err := q.Exec(ctx, `INSERT INTO vehicle_colors (id, model_id, color_name, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $5)`, id, modelID, name, actor, now)
	return err
}

func updateColor(ctx context.Context, q querier, id uuid.UUID, version int, name string, actor uuid.UUID, now time.Time) (bool, error) {
	tag, err := q.Exec(ctx, `UPDATE vehicle_colors SET color_name = $3, updated_by = $4, updated_at = $5, row_version = row_version + 1
		WHERE id = $1 AND row_version = $2`, id, version, name, actor, now)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() == 1, nil
}

func setColorActive(ctx context.Context, q querier, id uuid.UUID, active bool, actor uuid.UUID, now time.Time) error {
	var at *time.Time
	var by *uuid.UUID
	if !active {
		at, by = &now, &actor
	}
	_, err := q.Exec(ctx, `UPDATE vehicle_colors SET is_active = $2, deactivated_at = $3, deactivated_by = $4,
		updated_by = $5, updated_at = $6, row_version = row_version + 1 WHERE id = $1`, id, active, at, by, actor, now)
	return err
}

func countActiveColors(ctx context.Context, q querier, modelID uuid.UUID, except uuid.UUID) (int, error) {
	var n int
	err := q.QueryRow(ctx, `SELECT count(*) FROM vehicle_colors WHERE model_id = $1 AND is_active AND id <> $2`, modelID, except).Scan(&n)
	return n, err
}

// --- references from sales ---

func saleReferences(ctx context.Context, q querier, column string, id uuid.UUID) (bool, error) {
	var column2 string
	switch column {
	case "model":
		column2 = "vehicle_model_id"
	case "version":
		column2 = "vehicle_version_id"
	case "color":
		column2 = "vehicle_color_id"
	default:
		return false, fmt.Errorf("unknown sale reference %q", column)
	}
	var used bool
	err := q.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM sale_registers WHERE `+column2+` = $1)`, id).Scan(&used)
	return used, err
}

// --- lists ---

func escapeLike(s string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(s)
}

func listModels(ctx context.Context, q querier, f ModelFilter, base func(string) string) ([]ModelSummary, int, error) {
	var where []string
	var args []any
	add := func(v any) string {
		args = append(args, v)
		return fmt.Sprintf("$%d", len(args))
	}
	if f.Search != "" {
		term := add(escapeLike(strings.TrimSpace(f.Search)))
		where = append(where, fmt.Sprintf(`f_search_key(m.model_name) LIKE '%%' || f_search_key(%s) || '%%' ESCAPE '\'`, term))
	}
	if f.Category != "" {
		where = append(where, "EXISTS (SELECT 1 FROM vehicle_model_categories mc WHERE mc.model_id = m.id AND mc.category = "+add(f.Category)+"::text::vehicle_category)")
	}
	switch f.Status {
	case "active":
		where = append(where, "m.is_active")
	case "archived":
		where = append(where, "NOT m.is_active")
	}
	clause := "TRUE"
	if len(where) > 0 {
		clause = strings.Join(where, " AND ")
	}

	var total int
	if err := q.QueryRow(ctx, `SELECT count(*) FROM vehicle_models m WHERE `+clause, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	order := map[string]string{
		"name": "lower(m.model_name)", "-name": "lower(m.model_name) DESC",
		"createdAt": "m.created_at", "-createdAt": "m.created_at DESC",
	}[f.Sort]
	if order == "" {
		order = "lower(m.model_name)"
	}
	limit, offset := add(f.PageSize), add((f.Page-1)*f.PageSize)
	rows, err := q.Query(ctx, `SELECT m.id, m.model_name, m.description, m.is_active, m.row_version, m.created_at, m.updated_at,
			(SELECT coalesce(array_agg(mc.category::text ORDER BY mc.category), '{}') FROM vehicle_model_categories mc WHERE mc.model_id = m.id),
			(SELECT count(*) FROM vehicle_versions v WHERE v.model_id = m.id AND v.is_active),
			(SELECT count(*) FROM vehicle_colors c WHERE c.model_id = m.id AND c.is_active),
			(SELECT min(v.reference_price)::text FROM vehicle_versions v WHERE v.model_id = m.id AND v.is_active),
			(SELECT i.storage_key FROM vehicle_colors c JOIN catalog_images i ON i.vehicle_color_id = c.id AND i.viewpoint = 'main_view'
			   WHERE c.model_id = m.id AND c.is_active ORDER BY lower(c.color_name) LIMIT 1)
		FROM vehicle_models m WHERE `+clause+` ORDER BY `+order+`, m.id LIMIT `+limit+` OFFSET `+offset, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	items := []ModelSummary{}
	for rows.Next() {
		var s ModelSummary
		var key *string
		if err := rows.Scan(&s.ID, &s.Name, &s.Description, &s.IsActive, &s.Version, &s.CreatedAt, &s.UpdatedAt,
			&s.Categories, &s.ActiveVersionCount, &s.ActiveColorCount, &s.MinPrice, &key); err != nil {
			return nil, 0, err
		}
		if key != nil {
			url := base(*key)
			s.MainImageURL = &url
		}
		items = append(items, s)
	}
	return items, total, rows.Err()
}

// selectableModels returns the models the sale form can offer, with their selectable versions and colors
// (the v_selectable_* views apply the rules: model, entry active, and a Main view image).
func selectableModels(ctx context.Context, q querier, base func(string) string) ([]Selectable, error) {
	out := []Selectable{}
	index := map[uuid.UUID]int{}
	rows, err := q.Query(ctx, `SELECT m.id, m.model_name,
			(SELECT coalesce(array_agg(mc.category::text ORDER BY mc.category), '{}') FROM vehicle_model_categories mc WHERE mc.model_id = m.id)
		FROM vehicle_models m WHERE m.is_active ORDER BY lower(m.model_name)`)
	if err != nil {
		return nil, err
	}
	for rows.Next() {
		var s Selectable
		if err := rows.Scan(&s.ID, &s.Name, &s.Categories); err != nil {
			rows.Close()
			return nil, err
		}
		s.Versions, s.Colors = []SelectableVersion{}, []SelectableColor{}
		index[s.ID] = len(out)
		out = append(out, s)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return nil, err
	}

	vrows, err := q.Query(ctx, `SELECT v.model_id, v.id, v.version_name, v.reference_price::text
		FROM vehicle_versions v JOIN v_selectable_versions sv ON sv.version_id = v.id
		ORDER BY v.reference_price, lower(v.version_name)`)
	if err != nil {
		return nil, err
	}
	for vrows.Next() {
		var modelID uuid.UUID
		var v SelectableVersion
		if err := vrows.Scan(&modelID, &v.ID, &v.Name, &v.ReferencePrice); err != nil {
			vrows.Close()
			return nil, err
		}
		if i, ok := index[modelID]; ok {
			out[i].Versions = append(out[i].Versions, v)
		}
	}
	vrows.Close()
	if err := vrows.Err(); err != nil {
		return nil, err
	}

	crows, err := q.Query(ctx, `SELECT c.model_id, c.id, c.color_name, i.storage_key
		FROM vehicle_colors c JOIN v_selectable_colors sc ON sc.color_id = c.id
		JOIN catalog_images i ON i.vehicle_color_id = c.id AND i.viewpoint = 'main_view'
		ORDER BY lower(c.color_name)`)
	if err != nil {
		return nil, err
	}
	defer crows.Close()
	for crows.Next() {
		var modelID uuid.UUID
		var c SelectableColor
		var key string
		if err := crows.Scan(&modelID, &c.ID, &c.Name, &key); err != nil {
			return nil, err
		}
		c.MainImageURL = base(key)
		if i, ok := index[modelID]; ok {
			out[i].Colors = append(out[i].Colors, c)
		}
	}
	if err := crows.Err(); err != nil {
		return nil, err
	}

	// A model with nothing to choose from is not offered.
	offered := out[:0]
	for _, s := range out {
		if len(s.Versions) > 0 && len(s.Colors) > 0 {
			offered = append(offered, s)
		}
	}
	return offered, nil
}
