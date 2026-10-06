.DEFAULT_GOAL := help
.PHONY: help setup env up up-build down restart logs ps db-up db-down install push seed studio dev test clean

env: ## Ensure a .env exists (copied from .env.example)
	@test -f .env || { cp .env.example .env; echo "Created .env — set ANTHROPIC_API_KEY and run 'make setup' to generate AUTH_SECRET"; }

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

setup: ## Create .env from .env.example and generate an AUTH_SECRET
	@test -f .env || cp .env.example .env
	@grep -q 'replace-me-with-a-long-random-string' .env 2>/dev/null && \
		sed -i.bak "s|replace-me-with-a-long-random-string|$$(openssl rand -base64 32)|" .env && rm -f .env.bak && \
		echo "Generated AUTH_SECRET in .env" || echo ".env already configured"
	@echo "Now set ANTHROPIC_API_KEY (and ANTHROPIC_MODEL) in .env"

up: env ## Run the whole app (db + Next.js) in Docker
	docker compose up

up-build: ## Same as up but force a fresh dependency install
	docker compose up --force-recreate

down: ## Stop and remove containers
	docker compose down

restart: down up ## Restart everything

logs: ## Tail app logs
	docker compose logs -f app

ps: ## Show container status
	docker compose ps

db-up: ## Start only Postgres (for host-side `make dev`)
	docker compose up -d db

db-down: ## Stop Postgres
	docker compose stop db

install: ## Install node deps on the host
	npm install

push: ## Sync the Prisma schema into the database (no migration files)
	npx prisma db push

seed: ## Create the first user from SEED_* env vars
	npm run db:seed

studio: ## Open Prisma Studio
	npx prisma studio

dev: env db-up ## Run Next.js on the host against the dockerized DB
	@echo "Waiting for Postgres..."
	@until docker compose exec -T db pg_isready -U postgres -d ai_learner >/dev/null 2>&1; do sleep 1; done
	npx prisma db push
	npm run db:seed
	npm run dev

test: ## Run unit tests (mastery / scheduling logic)
	npm run test

clean: ## Remove containers AND volumes (wipes the database)
	docker compose down -v
