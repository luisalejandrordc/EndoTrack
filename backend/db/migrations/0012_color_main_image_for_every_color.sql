-- +goose Up
-- Every color needs its Main view image, whether the color (or its model) is active or archived,
-- because existing sales keep showing the catalog image of their color.
-- Archiving a model or a color never rewrites its children: availability is derived in the views.
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION trg_catalog_color_has_main() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_row jsonb;
  v_color uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_row := to_jsonb(OLD);
  ELSE
    v_row := to_jsonb(NEW);
  END IF;

  IF TG_TABLE_NAME = 'vehicle_colors' THEN
    v_color := (v_row ->> 'id')::uuid;
  ELSE
    v_color := (v_row ->> 'vehicle_color_id')::uuid;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM vehicle_colors WHERE id = v_color) THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM catalog_images WHERE vehicle_color_id = v_color AND viewpoint = 'main_view'
  ) THEN
    RAISE EXCEPTION 'color % needs its Main view image', v_color USING ERRCODE = 'EF005';
  END IF;
  RETURN NULL;
END $$;
-- +goose StatementEnd
