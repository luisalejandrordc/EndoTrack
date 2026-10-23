-- +goose Up
-- Six small triggers, used only where a declarative constraint cannot express the rule.
-- Custom SQLSTATE codes let the backend map each rule to a stable error:
--   EF001 immutable columns changed   EF002 task sequence broken   EF003 sale children missing
--   EF004 append-only table           EF005 catalog incomplete     EF006 last active Admin
-- 1. Snapshots, vehicle, customer and temperature never change after creation.
-- +goose StatementBegin
CREATE FUNCTION trg_sale_registers_immutable () RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.customer_id IS DISTINCT FROM OLD.customer_id
     OR NEW.customer_legal_name_snapshot IS DISTINCT FROM OLD.customer_legal_name_snapshot
     OR NEW.customer_doc_type_snapshot IS DISTINCT FROM OLD.customer_doc_type_snapshot
     OR NEW.customer_doc_number_snapshot IS DISTINCT FROM OLD.customer_doc_number_snapshot
     OR NEW.customer_type_snapshot IS DISTINCT FROM OLD.customer_type_snapshot
     OR NEW.vehicle_model_id IS DISTINCT FROM OLD.vehicle_model_id
     OR NEW.vehicle_version_id IS DISTINCT FROM OLD.vehicle_version_id
     OR NEW.vehicle_color_id IS DISTINCT FROM OLD.vehicle_color_id
     OR NEW.vehicle_model_name_snapshot IS DISTINCT FROM OLD.vehicle_model_name_snapshot
     OR NEW.vehicle_version_name_snapshot IS DISTINCT FROM OLD.vehicle_version_name_snapshot
     OR NEW.vehicle_color_name_snapshot IS DISTINCT FROM OLD.vehicle_color_name_snapshot
     OR NEW.vehicle_reference_price_snapshot IS DISTINCT FROM OLD.vehicle_reference_price_snapshot
     OR NEW.sale_temperature IS DISTINCT FROM OLD.sale_temperature
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'sale_registers: immutable columns cannot change' USING ERRCODE = 'EF001';
  END IF;
  RETURN NEW;
END $$;

-- +goose StatementEnd
CREATE TRIGGER sale_registers_immutable
BEFORE UPDATE ON sale_registers FOR EACH ROW
EXECUTE FUNCTION trg_sale_registers_immutable ();

-- 2. A sale always has exactly 13 tasks and its three one-to-one detail rows (checked at commit).
-- +goose StatementBegin
CREATE FUNCTION trg_sale_requires_children () RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_tasks integer;
BEGIN
  SELECT count(*) INTO v_tasks FROM task_instances WHERE sale_id = NEW.id;
  IF v_tasks <> 13 THEN
    RAISE EXCEPTION 'sale % must have exactly 13 task instances (found %)', NEW.id, v_tasks
      USING ERRCODE = 'EF003';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM sale_financials WHERE sale_id = NEW.id)
     OR NOT EXISTS (SELECT 1 FROM sale_due_diligence WHERE sale_id = NEW.id)
     OR NOT EXISTS (SELECT 1 FROM sale_fulfillment WHERE sale_id = NEW.id) THEN
    RAISE EXCEPTION 'sale % is missing one of its detail rows', NEW.id USING ERRCODE = 'EF003';
  END IF;
  RETURN NULL;
END $$;

-- +goose StatementEnd
CREATE CONSTRAINT TRIGGER sale_registers_requires_children
AFTER INSERT ON sale_registers
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION trg_sale_requires_children ();

-- 3. Completed tasks form a prefix and the in-progress task is the next one (checked at commit).
-- +goose StatementBegin
CREATE FUNCTION trg_task_sequence_guard () RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_completed integer;
  v_max_completed integer;
  v_active integer;
BEGIN
  SELECT count(*) FILTER (WHERE status = 'completed'),
         COALESCE(max(task_number) FILTER (WHERE status = 'completed'), 0),
         max(task_number) FILTER (WHERE status = 'in_progress')
    INTO v_completed, v_max_completed, v_active
    FROM task_instances
   WHERE sale_id = NEW.sale_id;

  IF v_max_completed <> v_completed THEN
    RAISE EXCEPTION 'sale %: completed tasks must form a prefix of the sequence', NEW.sale_id
      USING ERRCODE = 'EF002';
  END IF;
  IF v_active IS NOT NULL AND v_active <> v_completed + 1 THEN
    RAISE EXCEPTION 'sale %: the in-progress task must be the next task in the sequence', NEW.sale_id
      USING ERRCODE = 'EF002';
  END IF;
  RETURN NULL;
END $$;

-- +goose StatementEnd
CREATE CONSTRAINT TRIGGER task_instances_sequence_guard
AFTER INSERT OR UPDATE OF status ON task_instances
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION trg_task_sequence_guard ();

-- 4. Audit and access logs are append-only.
-- +goose StatementBegin
CREATE FUNCTION trg_append_only () RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = 'EF004';
END $$;

-- +goose StatementEnd
CREATE TRIGGER audit_logs_append_only
BEFORE UPDATE OR DELETE ON audit_logs FOR EACH ROW
EXECUTE FUNCTION trg_append_only ();

CREATE TRIGGER access_logs_append_only
BEFORE UPDATE OR DELETE ON access_logs FOR EACH ROW
EXECUTE FUNCTION trg_append_only ();

-- 5. An active model needs a category, an active version and an active color;
--    every color needs its Main view image (checked at commit).
-- +goose StatementBegin
CREATE FUNCTION trg_catalog_model_complete () RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_row jsonb;
  v_model uuid;
  v_active boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_row := to_jsonb(OLD);
  ELSE
    v_row := to_jsonb(NEW);
  END IF;

  IF TG_TABLE_NAME = 'vehicle_models' THEN
    v_model := (v_row ->> 'id')::uuid;
  ELSE
    v_model := (v_row ->> 'model_id')::uuid;
  END IF;

  SELECT is_active INTO v_active FROM vehicle_models WHERE id = v_model;
  IF NOT FOUND OR NOT v_active THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM vehicle_model_categories WHERE model_id = v_model) THEN
    RAISE EXCEPTION 'model % needs at least one category', v_model USING ERRCODE = 'EF005';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vehicle_versions WHERE model_id = v_model AND is_active) THEN
    RAISE EXCEPTION 'model % needs at least one active version', v_model USING ERRCODE = 'EF005';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vehicle_colors WHERE model_id = v_model AND is_active) THEN
    RAISE EXCEPTION 'model % needs at least one active color', v_model USING ERRCODE = 'EF005';
  END IF;
  RETURN NULL;
END $$;

-- +goose StatementEnd
CREATE CONSTRAINT TRIGGER vehicle_models_complete
AFTER INSERT OR UPDATE OR DELETE ON vehicle_models
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION trg_catalog_model_complete ();

CREATE CONSTRAINT TRIGGER vehicle_model_categories_complete
AFTER INSERT OR UPDATE OR DELETE ON vehicle_model_categories
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION trg_catalog_model_complete ();

CREATE CONSTRAINT TRIGGER vehicle_versions_complete
AFTER INSERT OR UPDATE OR DELETE ON vehicle_versions
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION trg_catalog_model_complete ();

CREATE CONSTRAINT TRIGGER vehicle_colors_complete
AFTER INSERT OR UPDATE OR DELETE ON vehicle_colors
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION trg_catalog_model_complete ();

-- +goose StatementBegin
CREATE FUNCTION trg_catalog_color_has_main () RETURNS trigger LANGUAGE plpgsql AS $$
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

  -- Applies to every color, active or archived, and whatever the state of its model:
  -- existing sales keep showing the catalog image of their color.
  IF NOT EXISTS (
    SELECT 1 FROM catalog_images WHERE vehicle_color_id = v_color AND viewpoint = 'main_view'
  ) THEN
    RAISE EXCEPTION 'color % needs its Main view image', v_color USING ERRCODE = 'EF005';
  END IF;
  RETURN NULL;
END $$;

-- +goose StatementEnd
CREATE CONSTRAINT TRIGGER vehicle_colors_main_image
AFTER INSERT OR UPDATE ON vehicle_colors
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION trg_catalog_color_has_main ();

CREATE CONSTRAINT TRIGGER catalog_images_main_image
AFTER UPDATE OR DELETE ON catalog_images
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION trg_catalog_color_has_main ();

-- 6. The last active System Admin cannot be deactivated, demoted or deleted (checked at commit).
-- +goose StatementBegin
CREATE FUNCTION trg_last_admin_guard () RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NOT (OLD.role = 'system_admin' AND OLD.is_active AND NOT OLD.is_system
            AND (NEW.role <> 'system_admin' OR NOT NEW.is_active)) THEN
      RETURN NULL;
    END IF;
  ELSE
    IF NOT (OLD.role = 'system_admin' AND OLD.is_active AND NOT OLD.is_system) THEN
      RETURN NULL;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM employees WHERE role = 'system_admin' AND is_active AND NOT is_system
  ) THEN
    RAISE EXCEPTION 'the last active system administrator cannot be removed' USING ERRCODE = 'EF006';
  END IF;
  RETURN NULL;
END $$;

-- +goose StatementEnd
CREATE CONSTRAINT TRIGGER employees_last_admin_guard
AFTER UPDATE OR DELETE ON employees
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW
EXECUTE FUNCTION trg_last_admin_guard ();
