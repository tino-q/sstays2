# Cleaning Management App - Development Commands
# Makefile for simplified stack management

.PHONY: help start stop restart dev status logs clean test build deploy install

# Colors for output
RED    := \033[31m
GREEN  := \033[32m
YELLOW := \033[33m
BLUE   := \033[34m
RESET  := \033[0m


## Stack Management
start: ## Start Supabase (database + auth + storage)
	@echo "$(BLUE)🚀 Starting Supabase stack...$(RESET)"
	@supabase start

stop: ## Stop all services (Supabase + Edge Functions)
	@echo "$(BLUE)🛑 Stopping services...$(RESET)"
	@-pkill -f "supabase functions serve" 2>/dev/null || true
	@-pkill -f "vite.*frontend" 2>/dev/null || true
	@supabase stop
	@echo "$(GREEN)✅ All services stopped$(RESET)"

restart: stop start ## Restart entire stack
	@echo "$(GREEN)✅ Stack restarted$(RESET)"

dev: ## Start Edge Functions development server
	@echo "$(BLUE)🔧 Starting Edge Functions...$(RESET)"
	@echo "$(YELLOW)💡 Make sure Supabase is running first (make start)$(RESET)"
	@supabase functions serve

frontend: ## Start React frontend development server
	@echo "$(BLUE)🎨 Starting React frontend...$(RESET)"
	@echo "$(YELLOW)💡 Make sure backend is running first (make start && make dev)$(RESET)"
	@npm run frontend:dev

full-dev: ## Start complete development environment (all services)
	@echo "$(BLUE)🚀 Starting complete development environment...$(RESET)"
	@echo "$(YELLOW)This will start Supabase, Edge Functions, and Frontend$(RESET)"
	@echo "$(YELLOW)Press Ctrl+C to stop all services$(RESET)"
	@$(MAKE) start
	@echo "$(BLUE)Starting Edge Functions in background...$(RESET)"
	@supabase functions serve > logs/functions.log 2>&1 & echo $$! > .pids/functions.pid
	@sleep 2
	@echo "$(BLUE)Starting Frontend...$(RESET)"
	@npm run frontend:dev

status: ## Show status of all services
	@echo "$(BLUE)📊 Service Status:$(RESET)"
	@echo ""
	@echo "$(YELLOW)Supabase:$(RESET)"
	@supabase status 2>/dev/null || echo "  $(RED)❌ Not running$(RESET)"
	@echo ""
	@echo "$(YELLOW)Edge Functions:$(RESET)"
	@if pgrep -f "supabase functions serve" > /dev/null; then \
		echo "  $(GREEN)✅ Running$(RESET)"; \
	else \
		echo "  $(RED)❌ Not running$(RESET)"; \
	fi
	@echo ""
	@echo "$(YELLOW)Frontend:$(RESET)"
	@if pgrep -f "vite.*frontend" > /dev/null; then \
		echo "  $(GREEN)✅ Running$(RESET)"; \
	else \
		echo "  $(RED)❌ Not running$(RESET)"; \
	fi

## Testing
test: ## Run all tests (unit + integration + frontend + e2e)
	@echo "$(BLUE)🧪 Running all tests...$(RESET)"
	@npm test

test-unit: ## Run backend unit tests only
	@echo "$(BLUE)🧪 Running backend unit tests...$(RESET)"
	@npm run test:backend:unit

test-integration: ## Run backend integration tests (requires running stack)
	@echo "$(BLUE)🧪 Running backend integration tests...$(RESET)"
	@echo "$(YELLOW)💡 Ensure stack is running (make start && make dev)$(RESET)"
	@npm run test:backend:integration

test-frontend: ## Run frontend tests with mocked backend
	@echo "$(BLUE)🧪 Running frontend tests...$(RESET)"
	@npm run test:frontend

test-e2e: ## Run end-to-end tests in headless mode (auto-setup)
	@echo "$(BLUE)🧪 Running e2e tests...$(RESET)"
	@./scripts/e2e-setup.sh
	@npm run test:e2e

test-e2e-ui: ## Run e2e tests with UI mode (interactive)
	@echo "$(BLUE)🧪 Running e2e tests with UI...$(RESET)"
	@echo "$(YELLOW)💡 Ensure Supabase is running (make start)$(RESET)"
	@npm run test:e2e:ui

test-e2e-headed: ## Run e2e tests with browser visible
	@echo "$(BLUE)🧪 Running e2e tests with visible browser...$(RESET)"
	@echo "$(YELLOW)💡 Ensure Supabase is running (make start)$(RESET)"
	@npm run test:e2e:headed

test-e2e-debug: ## Run e2e tests in debug mode
	@echo "$(BLUE)🧪 Running e2e tests in debug mode...$(RESET)"
	@echo "$(YELLOW)💡 Ensure Supabase is running (make start)$(RESET)"
	@npm run test:e2e:debug

test-watch: ## Run tests in watch mode
	@echo "$(BLUE)🧪 Running tests in watch mode...$(RESET)"
	@npm run test:watch

## Build and Deploy
build: ## Build frontend for production
	@echo "$(BLUE)🏗️  Building frontend...$(RESET)"
	@npm run frontend:build
	@echo "$(GREEN)✅ Frontend built successfully$(RESET)"

deploy-functions: ## Deploy Edge Functions to Supabase
	@echo "$(BLUE)🚀 Deploying Edge Functions...$(RESET)"
	@supabase functions deploy
	@echo "$(GREEN)✅ Edge Functions deployed$(RESET)"

deploy: build deploy-functions ## Build and deploy everything
	@echo "$(GREEN)✅ Full deployment complete$(RESET)"

## Database Management
db-reset: ## Reset database (apply migrations and seed data)
	@echo "$(BLUE)🗄️  Resetting database...$(RESET)"
	@supabase db reset
	@echo "$(GREEN)✅ Database reset complete$(RESET)"

db-migrate: ## Apply database migrations
	@echo "$(BLUE)🗄️  Applying database migrations...$(RESET)"
	@supabase db push
	@echo "$(GREEN)✅ Migrations applied$(RESET)"

## Utilities
install: ## Install dependencies
	@echo "$(BLUE)📦 Installing dependencies...$(RESET)"
	@npm install
	@echo "$(GREEN)✅ Dependencies installed$(RESET)"

logs: ## Show logs from running services
	@echo "$(BLUE)📋 Service Logs:$(RESET)"
	@echo ""
	@echo "$(YELLOW)Recent Edge Functions logs:$(RESET)"
	@if [ -f logs/functions.log ]; then \
		tail -20 logs/functions.log; \
	else \
		echo "  $(RED)No logs found$(RESET)"; \
	fi

clean: ## Clean up temporary files and stop all services
	@echo "$(BLUE)🧹 Cleaning up...$(RESET)"
	@$(MAKE) stop
	@rm -rf logs/*.log .pids/*.pid 2>/dev/null || true
	@rm -rf node_modules/.cache 2>/dev/null || true
	@rm -rf dist/ 2>/dev/null || true
	@echo "$(GREEN)✅ Cleanup complete$(RESET)"

setup: install ## Initial project setup
	@echo "$(BLUE)🛠️  Setting up project...$(RESET)"
	@mkdir -p logs .pids
	@$(MAKE) start
	@echo "$(GREEN)✅ Project setup complete$(RESET)"
	@echo "$(YELLOW)💡 Run 'make dev' to start Edge Functions$(RESET)"

health: ## Check health of running services
	@echo "$(BLUE)🏥 Health Check:$(RESET)"
	@echo ""
	@echo "$(YELLOW)Testing health endpoints...$(RESET)"
	@curl -s http://localhost:54321/functions/v1/health/health 2>/dev/null | jq . || echo "  $(RED)❌ Health endpoint not responding$(RESET)"

## Quick Development Workflows
quick-start: ## Quick start: install + start + dev (one command setup)
	@echo "$(BLUE)⚡ Quick Start - Complete Development Setup$(RESET)"
	@$(MAKE) install
	@$(MAKE) start
	@echo "$(GREEN)✅ Quick start complete!$(RESET)"
	@echo "$(YELLOW)💡 Run 'make dev' in another terminal for Edge Functions$(RESET)"
	@echo "$(YELLOW)💡 Run 'make frontend' in another terminal for React app$(RESET)"

check: ## Run health check and show status
	@$(MAKE) status
	@$(MAKE) health

## Development helpers
fresh-start: clean setup ## Complete fresh start (clean + setup)
	@echo "$(GREEN)✅ Fresh start complete$(RESET)"