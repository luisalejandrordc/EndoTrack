-- +goose Up
-- Reference data that carries attributes. Rows are inserted by a seed migration once the
-- Spanish descriptions are approved. Banks, customs offices and categories are enums instead.
CREATE TABLE milestone_definitions (
  milestone_number smallint PRIMARY KEY CHECK (milestone_number BETWEEN 1 AND 6),
  name_es text NOT NULL,
  description_es text NOT NULL
);

CREATE TABLE task_definitions (
  task_number smallint PRIMARY KEY CHECK (task_number BETWEEN 1 AND 13),
  name_es text NOT NULL,
  description_es text NOT NULL,
  milestone_number smallint NOT NULL REFERENCES milestone_definitions (milestone_number),
  recommended_duration_hours integer,
  reminder_interval_hours integer,
  CONSTRAINT task_definitions_sla_pair
    CHECK ((recommended_duration_hours IS NULL) = (reminder_interval_hours IS NULL)),
  CONSTRAINT task_definitions_duration_positive
    CHECK (recommended_duration_hours IS NULL OR recommended_duration_hours > 0),
  CONSTRAINT task_definitions_interval_positive
    CHECK (reminder_interval_hours IS NULL OR reminder_interval_hours > 0)
);

CREATE TABLE document_slots (
  slot_code text PRIMARY KEY,
  task_number smallint NOT NULL REFERENCES task_definitions (task_number),
  label_es text NOT NULL,
  allowed_format document_format NOT NULL,
  is_customer_visible boolean NOT NULL,
  requirement slot_requirement NOT NULL DEFAULT 'always'
);
