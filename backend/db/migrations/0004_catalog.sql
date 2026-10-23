-- +goose Up
CREATE TABLE vehicle_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  deactivated_at timestamptz,
  deactivated_by uuid REFERENCES employees (id),
  row_version integer NOT NULL DEFAULT 1,
  created_by uuid NOT NULL REFERENCES employees (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES employees (id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vehicle_models_lifecycle CHECK (is_active = (deactivated_at IS NULL))
);

CREATE UNIQUE INDEX ux_vehicle_models_name ON vehicle_models (lower(model_name));

CREATE TABLE vehicle_model_categories (
  model_id uuid NOT NULL REFERENCES vehicle_models (id),
  category vehicle_category NOT NULL,
  PRIMARY KEY (model_id, category)
);

CREATE TABLE vehicle_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES vehicle_models (id),
  version_name text NOT NULL,
  reference_price numeric(12, 2) NOT NULL CHECK (reference_price > 0),
  is_active boolean NOT NULL DEFAULT true,
  deactivated_at timestamptz,
  deactivated_by uuid REFERENCES employees (id),
  row_version integer NOT NULL DEFAULT 1,
  created_by uuid NOT NULL REFERENCES employees (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES employees (id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vehicle_versions_id_model_unique UNIQUE (id, model_id),
  CONSTRAINT vehicle_versions_lifecycle CHECK (is_active = (deactivated_at IS NULL))
);

CREATE UNIQUE INDEX ux_vehicle_versions_name ON vehicle_versions (model_id, lower(version_name));

CREATE TABLE vehicle_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES vehicle_models (id),
  color_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  deactivated_at timestamptz,
  deactivated_by uuid REFERENCES employees (id),
  row_version integer NOT NULL DEFAULT 1,
  created_by uuid NOT NULL REFERENCES employees (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES employees (id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vehicle_colors_id_model_unique UNIQUE (id, model_id),
  CONSTRAINT vehicle_colors_lifecycle CHECK (is_active = (deactivated_at IS NULL))
);

CREATE UNIQUE INDEX ux_vehicle_colors_name ON vehicle_colors (model_id, lower(color_name));

CREATE TABLE catalog_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_color_id uuid NOT NULL REFERENCES vehicle_colors (id),
  viewpoint viewpoint NOT NULL,
  mime_type text NOT NULL CHECK (
    mime_type IN ('image/jpeg', 'image/png', 'image/webp')
  ),
  size_bytes integer NOT NULL CHECK (
    size_bytes > 0
    AND size_bytes <= 5242880
  ),
  storage_key text NOT NULL UNIQUE,
  uploaded_by uuid NOT NULL REFERENCES employees (id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES employees (id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_images_color_viewpoint_unique UNIQUE (vehicle_color_id, viewpoint)
);
