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

test-e2e-headed: ## Run e2e tests with browser visible
	@echo "$(BLUE)🧪 Running e2e tests with visible browser...$(RESET)"
	@echo "$(YELLOW)💡 Ensure Supabase is running (make start)$(RESET)"
	@npm run test:e2e:headed

## Build and Deploy
build: ## Build frontend for production
	@echo "$(BLUE)🏗️  Building frontend...$(RESET)"
	@npm run frontend:build
	@echo "$(GREEN)✅ Frontend built successfully$(RESET)"

## Database Management
db-reset: ## Reset database (apply migrations and seed data)
	@echo "$(BLUE)🗄️  Resetting database...$(RESET)"
	@supabase db reset
	@echo "$(GREEN)✅ Database reset complete$(RESET)"