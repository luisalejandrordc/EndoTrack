# EndosoFlow developer commands
# Run `make help` to list them.

ENV_FILE := backend/.env

ifneq (,$(wildcard $(ENV_FILE)))
include $(ENV_FILE)
export
endif

DEV_DB  ?= endosoflow_dev
TEST_DB ?= endosoflow_test

DATABASE_URL ?= postgres://$(DB_USER):$(DB_PASS)@$(DB_HOST):$(DB_PORT)/$(DEV_DB)?sslmode=disable
TEST_DATABASE_URL ?= postgres://$(DB_USER):$(DB_PASS)@$(DB_HOST):$(DB_PORT)/$(TEST_DB)?sslmode=disable

MIGRATIONS  := backend/db/migrations
VERIFY_SQL  := backend/db/verify/constraints.sql

.PHONY: help db-create db-drop db-reset migrate-up migrate-status db-verify

help:
	@echo "db-create       create the dev and test databases"
	@echo "migrate-up      apply all migrations to the dev database"
	@echo "migrate-status  show which migrations are applied"
	@echo "db-reset        drop and recreate the dev database, then migrate"
	@echo "db-verify       rebuild the test database and run the SQL rule checks"

db-create:
	-createdb $(DEV_DB)
	-createdb $(TEST_DB)

db-drop:
	dropdb --if-exists $(DEV_DB)
	dropdb --if-exists $(TEST_DB)

migrate-up:
	goose -dir $(MIGRATIONS) postgres "$(DATABASE_URL)" up

migrate-status:
	goose -dir $(MIGRATIONS) postgres "$(DATABASE_URL)" status

db-reset:
	dropdb --if-exists $(DEV_DB)
	createdb $(DEV_DB)
	$(MAKE) migrate-up

db-verify:
	dropdb --if-exists $(TEST_DB)
	createdb $(TEST_DB)
	goose -dir $(MIGRATIONS) postgres "$(TEST_DATABASE_URL)" up
	psql -v ON_ERROR_STOP=1 "$(TEST_DATABASE_URL)" -f $(VERIFY_SQL)
