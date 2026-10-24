-- +goose Up
-- Current task = the in-progress task, otherwise the lowest-numbered task that is not completed.
CREATE VIEW v_sale_current_task AS
SELECT
  s.id AS sale_id,
  ct.task_number AS current_task_number,
  ct.status AS current_task_status
FROM
  sale_registers s
  LEFT JOIN LATERAL (
    SELECT
      t.task_number,
      t.status
    FROM
      task_instances t
    WHERE
      t.sale_id = s.id
      AND t.status <> 'completed'
    ORDER BY
      t.task_number
    LIMIT
      1
  ) ct ON true;

-- One derived state per sale and milestone (completed, in progress, pending).
CREATE VIEW v_sale_milestones AS
SELECT
  s.id AS sale_id,
  m.milestone_number,
  (
    CASE
      WHEN bool_and(t.status = 'completed') THEN 'completed'
      WHEN bool_or(t.task_number = c.current_task_number) THEN 'in_progress'
      ELSE 'pending'
    END
  )::milestone_state AS state
FROM
  sale_registers s
  JOIN task_instances t ON t.sale_id = s.id
  JOIN task_definitions d ON d.task_number = t.task_number
  JOIN milestone_definitions m ON m.milestone_number = d.milestone_number
  JOIN v_sale_current_task c ON c.sale_id = s.id
GROUP BY
  s.id,
  m.milestone_number,
  c.current_task_number;

-- In-progress tasks with an SLA, for the reminder scheduler (Phase 3).
CREATE VIEW v_task_sla_state AS
SELECT
  t.id AS task_instance_id,
  t.sale_id,
  t.task_number,
  t.started_at,
  t.due_date,
  d.recommended_duration_hours,
  d.reminder_interval_hours,
  t.approaching_warning_sent_at,
  t.last_reminder_sent_at,
  t.overdue_reminder_count,
  t.started_at + (d.recommended_duration_hours * 0.8) * interval '1 hour' AS approaching_at
FROM
  task_instances t
  JOIN task_definitions d ON d.task_number = t.task_number
  JOIN sale_registers s ON s.id = t.sale_id
WHERE
  t.status = 'in_progress'
  AND t.due_date IS NOT NULL
  AND s.overall_state = 'active';

-- Selectable choices for the sale form: the model, version and color must all be active,
-- and a color needs its Main view image.
CREATE VIEW v_selectable_versions AS
SELECT
  v.id AS version_id,
  v.model_id
FROM
  vehicle_versions v
  JOIN vehicle_models m ON m.id = v.model_id
WHERE
  v.is_active
  AND m.is_active;

CREATE VIEW v_selectable_colors AS
SELECT
  c.id AS color_id,
  c.model_id
FROM
  vehicle_colors c
  JOIN vehicle_models m ON m.id = c.model_id
WHERE
  c.is_active
  AND m.is_active
  AND EXISTS (
    SELECT
      1
    FROM
      catalog_images i
    WHERE
      i.vehicle_color_id = c.id
      AND i.viewpoint = 'main_view'
  );

-- When each task became eligible to start: the previous task's completion time (Task 1: the sale's
-- creation time). It is NULL while the previous task is not completed. Derived rather than stored, so it can
-- never disagree with the tasks themselves, and a reopened task automatically changes the next task's value.
CREATE VIEW v_task_eligibility AS
SELECT
  t.id AS task_instance_id,
  t.sale_id,
  t.task_number,
  t.status,
  t.started_at,
  CASE
    WHEN t.task_number = 1 THEN s.created_at
    ELSE prev.completed_at
  END AS eligible_at
FROM
  task_instances t
  JOIN sale_registers s ON s.id = t.sale_id
  LEFT JOIN task_instances prev ON prev.sale_id = t.sale_id
  AND prev.task_number = t.task_number - 1
  AND prev.status = 'completed';
