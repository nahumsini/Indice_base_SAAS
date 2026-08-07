SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

COMPOSE_FILES := -f deployment/compose/docker-compose.yml -f deployment/compose/docker-compose.dev.yml
COMPOSE := docker compose $(COMPOSE_FILES)
LOCAL_COMPOSE_ENV = APP_HR_KIOSK_IDENTIFICATION_TOKEN_SECRET="$(LOCAL_HR_KIOSK_IDENTIFICATION_TOKEN_SECRET)" APP_KIOSK_TOKEN_PROTECTION_SECRET="$(LOCAL_KIOSK_TOKEN_PROTECTION_SECRET)"
INFRA_SERVICES ?= minio minio-init face-service
COMPOSE_MINIO_CONTAINER := indice-erp-minio-1
LEGACY_MINIO_CONTAINER := indice-minio

FRONTEND_DIR := react
FRONTEND_HOST ?= 127.0.0.1
FRONTEND_PORT ?= 5174
SPRING_PROFILE ?= minio
DB_CONTAINER ?= indice-mysql-fresh
DB_HOST_PORT ?= 3307
DB_NAME ?= indice_db
DB_USER ?= indice_user
DB_PASSWORD ?= indice_pass
DB_ROOT_PASSWORD ?= rootpass

MINIO_API_HOST_PORT ?= 9000
MINIO_CONSOLE_HOST_PORT ?= 9001
MINIO_PUBLIC_ENDPOINT ?= http://127.0.0.1:$(MINIO_API_HOST_PORT)
MINIO_SERVICE_PUBLIC_ENDPOINT ?= http://host.docker.internal:$(MINIO_API_HOST_PORT)
VITE_BACKEND_URL ?= http://127.0.0.1:8082
VITE_API_BASE_URL ?=

# Local-only kiosk secrets. Production must continue providing its own secrets
# through the deployment environment.
LOCAL_HR_KIOSK_IDENTIFICATION_TOKEN_SECRET ?= indice-local-hr-identification-secret-2026
LOCAL_KIOSK_TOKEN_PROTECTION_SECRET ?= indice-local-kiosk-protection-secret-2026
LOCAL_BACKEND_JVM_ARGUMENTS ?= -Dspring.devtools.restart.enabled=false -Dapp.kiosk.secret-protection.enabled=false

export MINIO_API_HOST_PORT
export MINIO_CONSOLE_HOST_PORT

.DEFAULT_GOAL := help

.PHONY: help dev up prepare minio-port-check mysql infra db-repair db-reset frontend-install backend frontend ps logs down

help: ## Show available targets
	@awk 'BEGIN {FS = ":.*##"; printf "Usage: make <target>\n\nTargets:\n"} /^[a-zA-Z0-9_.-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

dev: prepare ## Start the full local dev stack
	@backend_pid=""; frontend_pid=""; \
	cleanup() { \
		if [[ -n "$$backend_pid" ]]; then kill "$$backend_pid" 2>/dev/null || true; fi; \
		if [[ -n "$$frontend_pid" ]]; then kill "$$frontend_pid" 2>/dev/null || true; fi; \
		wait "$$backend_pid" "$$frontend_pid" 2>/dev/null || true; \
	}; \
	trap 'cleanup; exit 130' INT; \
	trap 'cleanup; exit 143' TERM; \
	trap cleanup EXIT; \
	echo "Starting backend on http://127.0.0.1:8082"; \
	APP_STORAGE_MINIO_PUBLIC_ENDPOINT="$(MINIO_PUBLIC_ENDPOINT)" \
	APP_STORAGE_MINIO_SERVICE_PUBLIC_ENDPOINT="$(MINIO_SERVICE_PUBLIC_ENDPOINT)" \
	APP_HR_KIOSK_IDENTIFICATION_TOKEN_SECRET="$(LOCAL_HR_KIOSK_IDENTIFICATION_TOKEN_SECRET)" \
	APP_KIOSK_TOKEN_PROTECTION_SECRET="$(LOCAL_KIOSK_TOKEN_PROTECTION_SECRET)" \
	./mvnw spring-boot:run -P$(SPRING_PROFILE) \
		-Dspring-boot.run.jvmArguments="$(LOCAL_BACKEND_JVM_ARGUMENTS)" & backend_pid=$$!; \
	echo "Starting frontend with Vite on http://$(FRONTEND_HOST):$(FRONTEND_PORT)"; \
	VITE_BACKEND_URL="$(VITE_BACKEND_URL)" \
	VITE_API_BASE_URL="$(VITE_API_BASE_URL)" \
	npm --prefix "$(FRONTEND_DIR)" run dev -- --host "$(FRONTEND_HOST)" --port "$(FRONTEND_PORT)" --strictPort & frontend_pid=$$!; \
	while true; do \
		running_jobs="$$(jobs -rp || true)"; \
		if ! grep -qx "$$backend_pid" <<< "$$running_jobs"; then \
			wait "$$backend_pid" || status=$$?; \
			break; \
		fi; \
		if ! grep -qx "$$frontend_pid" <<< "$$running_jobs"; then \
			wait "$$frontend_pid" || status=$$?; \
			break; \
		fi; \
		sleep 1; \
	done; \
	status=$${status:-0}; \
	trap - EXIT; \
	cleanup; \
	exit $$status

up: dev ## Alias for dev

prepare: infra frontend-install ## Prepare Docker services and frontend deps without resetting the database

minio-port-check: ## Stop stale Indice MinIO port conflicts
	@for port in "$(MINIO_API_HOST_PORT)" "$(MINIO_CONSOLE_HOST_PORT)"; do \
		for container in $$(docker ps --filter "publish=$$port" --format '{{.Names}}'); do \
			if [[ "$$container" == "$(COMPOSE_MINIO_CONTAINER)" ]]; then \
				continue; \
			fi; \
			if [[ "$$container" == "$(LEGACY_MINIO_CONTAINER)" ]]; then \
				echo "Stopping stale Indice MinIO container $$container using port $$port"; \
				docker stop "$$container" >/dev/null; \
				continue; \
			fi; \
			echo "Port $$port is already used by Docker container $$container."; \
			echo "Stop that container or run: make MINIO_API_HOST_PORT=19000 MINIO_CONSOLE_HOST_PORT=19001 dev"; \
			exit 1; \
		done; \
	done

mysql: ## Start local MySQL without resetting the database
	@CONTAINER_NAME="$(DB_CONTAINER)" \
	HOST_PORT="$(DB_HOST_PORT)" \
	DATABASE_NAME="$(DB_NAME)" \
	DATABASE_USER="$(DB_USER)" \
	DATABASE_PASSWORD="$(DB_PASSWORD)" \
	MYSQL_ROOT_PASSWORD="$(DB_ROOT_PASSWORD)" \
	./scripts/ensure-local-mysql.sh

infra: mysql minio-port-check ## Start MySQL, MinIO, minio-init, and face-service
	@$(LOCAL_COMPOSE_ENV) $(COMPOSE) up -d --force-recreate minio minio-init
	@$(LOCAL_COMPOSE_ENV) $(COMPOSE) up -d face-service

db-repair: ## Repair Flyway metadata without resetting the database
	@CONTAINER_NAME="$(DB_CONTAINER)" \
	HOST_PORT="$(DB_HOST_PORT)" \
	DATABASE_NAME="$(DB_NAME)" \
	DATABASE_USER="$(DB_USER)" \
	DATABASE_PASSWORD="$(DB_PASSWORD)" \
	MYSQL_ROOT_PASSWORD="$(DB_ROOT_PASSWORD)" \
	./scripts/db-repair.sh

db-reset: ## Destructively reset the local MySQL database
	@echo "WARNING: this will drop and recreate $(DB_NAME) inside $(DB_CONTAINER)."
	@CONTAINER_NAME="$(DB_CONTAINER)" \
	HOST_PORT="$(DB_HOST_PORT)" \
	DATABASE_NAME="$(DB_NAME)" \
	DATABASE_USER="$(DB_USER)" \
	DATABASE_PASSWORD="$(DB_PASSWORD)" \
	MYSQL_ROOT_PASSWORD="$(DB_ROOT_PASSWORD)" \
	./scripts/reset-local-db.sh

frontend-install: ## Install frontend dependencies
	npm --prefix "$(FRONTEND_DIR)" install

backend: ## Run only the Spring Boot backend with the MinIO profile
	@APP_STORAGE_MINIO_PUBLIC_ENDPOINT="$(MINIO_PUBLIC_ENDPOINT)" \
	APP_STORAGE_MINIO_SERVICE_PUBLIC_ENDPOINT="$(MINIO_SERVICE_PUBLIC_ENDPOINT)" \
	APP_HR_KIOSK_IDENTIFICATION_TOKEN_SECRET="$(LOCAL_HR_KIOSK_IDENTIFICATION_TOKEN_SECRET)" \
	APP_KIOSK_TOKEN_PROTECTION_SECRET="$(LOCAL_KIOSK_TOKEN_PROTECTION_SECRET)" \
	./mvnw spring-boot:run -P$(SPRING_PROFILE) \
		-Dspring-boot.run.jvmArguments="$(LOCAL_BACKEND_JVM_ARGUMENTS)"

frontend: ## Run only the React/Vite frontend
	@VITE_BACKEND_URL="$(VITE_BACKEND_URL)" \
	VITE_API_BASE_URL="$(VITE_API_BASE_URL)" \
	npm --prefix "$(FRONTEND_DIR)" run dev -- --host "$(FRONTEND_HOST)" --port "$(FRONTEND_PORT)" --strictPort

ps: ## Show Docker service status
	@docker ps -a --filter "name=$(DB_CONTAINER)" --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
	@$(LOCAL_COMPOSE_ENV) $(COMPOSE) ps

logs: ## Tail Docker service logs
	@$(LOCAL_COMPOSE_ENV) $(COMPOSE) logs -f $(INFRA_SERVICES)

down: ## Stop compose services and the local MySQL container
	@$(LOCAL_COMPOSE_ENV) $(COMPOSE) down
	@if docker container inspect "$(DB_CONTAINER)" >/dev/null 2>&1; then \
		docker stop "$(DB_CONTAINER)" >/dev/null; \
	fi
