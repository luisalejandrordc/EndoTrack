-- +goose Up
-- Holds only the current file of each slot, never a history.
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL,
  task_instance_id uuid NOT NULL,
  slot_code text NOT NULL REFERENCES document_slots (slot_code),
  original_file_name text NOT NULL,
  mime_type text NOT NULL CHECK (mime_type IN (
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel')),
  size_bytes integer NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  storage_key text NOT NULL UNIQUE,
  checksum_sha256 text NOT NULL CHECK (checksum_sha256 ~ '^[0-9a-f]{64}$'),
  uploaded_by uuid NOT NULL REFERENCES employees (id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  row_version integer NOT NULL DEFAULT 1,
  -- A file cannot point at another sale's task
  CONSTRAINT documents_task_sale_fk
    FOREIGN KEY (task_instance_id, sale_id) REFERENCES task_instances (id, sale_id) ON DELETE CASCADE,
  -- A slot holds at most one file
  CONSTRAINT documents_slot_unique UNIQUE (task_instance_id, slot_code)
);
CREATE INDEX ix_documents_sale ON documents (sale_id);

-- Outbox for deleting stored objects after the database change commits
CREATE TABLE storage_deletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_key text NOT NULL,
  reason storage_deletion_reason NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX ix_storage_deletions_open ON storage_deletions (created_at) WHERE completed_at IS NULL;
