SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

COMPOSE_FILES := -f deployment/compose/docker-compose.yml -f deployment/compose/docker-compose.dev.yml
COMPOSE := docker compose $(COMPOSE_FILES)
INFRA_SERVICES ?= minio minio-init face-service
COMPOSE_MINIO_CONTAINER := indice-erp-minio-1
LEGACY_MINIO_CONTAINER := indice-minio

FRONTEND_DIR := react
FRONTEND_HOST ?= 127.0.0.1
FRONTEND_PORT ?= 5174
SPRING_PROFILE ?= minio
DB_CONTAINER ?= indice-mysql-fresh

MINIO_API_HOST_PORT ?= 9000
MINIO_CONSOLE_HOST_PORT ?= 9001
MINIO_PUBLIC_ENDPOINT ?= http://127.0.0.1:$(MINIO_API_HOST_PORT)
MINIO_SERVICE_PUBLIC_ENDPOINT ?= http://host.docker.internal:$(MINIO_API_HOST_PORT)
VITE_BACKEND_URL ?= http://127.0.0.1:8082
VITE_API_BASE_URL ?=

export MINIO_API_HOST_PORT
export MINIO_CONSOLE_HOST_PORT

.DEFAULT_GOAL := help

.PHONY: help dev prepare minio-port-check infra reset-db frontend-install backend frontend ps logs down

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
	./mvnw spring-boot:run -P$(SPRING_PROFILE) & backend_pid=$$!; \
	echo "Starting frontend with Vite on http://$(FRONTEND_HOST):$(FRONTEND_PORT)"; \
	VITE_BACKEND_URL="$(VITE_BACKEND_URL)" \
	VITE_API_BASE_URL="$(VITE_API_BASE_URL)" \
	npm --prefix "$(FRONTEND_DIR)" run dev -- --host "$(FRONTEND_HOST)" --port "$(FRONTEND_PORT)" --strictPort & frontend_pid=$$!; \
	wait -n "$$backend_pid" "$$frontend_pid" || status=$$?; \
	status=$${status:-0}; \
	trap - EXIT; \
	cleanup; \
	exit $$status

prepare: infra reset-db frontend-install ## Prepare Docker services, database, and frontend deps

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

infra: minio-port-check ## Start MinIO, minio-init, and face-service
	$(COMPOSE) up -d --force-recreate minio minio-init
	$(COMPOSE) up -d face-service

reset-db: ## Reset the local MySQL database
	CONTAINER_NAME="$(DB_CONTAINER)" ./scripts/reset-local-db.sh

frontend-install: ## Install frontend dependencies
	npm --prefix "$(FRONTEND_DIR)" install

backend: ## Run only the Spring Boot backend with the MinIO profile
	APP_STORAGE_MINIO_PUBLIC_ENDPOINT="$(MINIO_PUBLIC_ENDPOINT)" \
	APP_STORAGE_MINIO_SERVICE_PUBLIC_ENDPOINT="$(MINIO_SERVICE_PUBLIC_ENDPOINT)" \
	./mvnw spring-boot:run -P$(SPRING_PROFILE)

frontend: ## Run only the React/Vite frontend
	VITE_BACKEND_URL="$(VITE_BACKEND_URL)" \
	VITE_API_BASE_URL="$(VITE_API_BASE_URL)" \
	npm --prefix "$(FRONTEND_DIR)" run dev -- --host "$(FRONTEND_HOST)" --port "$(FRONTEND_PORT)" --strictPort

ps: ## Show Docker service status
	$(COMPOSE) ps

logs: ## Tail Docker service logs
	$(COMPOSE) logs -f $(INFRA_SERVICES)

down: ## Stop compose services and the local MySQL container
	$(COMPOSE) down
	@if docker container inspect "$(DB_CONTAINER)" >/dev/null 2>&1; then \
		docker stop "$(DB_CONTAINER)" >/dev/null; \
	fi
