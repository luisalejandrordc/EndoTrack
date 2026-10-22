-- +goose Up
-- Defense in depth for Supabase: its auto-generated API roles (anon, authenticated) must never read these
-- tables. Row-level security is enabled with no policies, so only the table owner and roles with
-- BYPASSRLS (the backend connection) can access rows. Also disable the Data API in the Supabase dashboard.
ALTER TABLE milestone_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_model_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_due_diligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_fulfillment ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_deletions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lookup_logs ENABLE ROW LEVEL SECURITY;
