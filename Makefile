# SAL Accounting System - Makefile
# =================================

.PHONY: help docker-up docker-down docker-logs db-init dev build start clean

# Default target
help:
	@echo "SAL Accounting System - Available Commands"
	@echo "==========================================="
	@echo ""
	@echo "Docker & Database:"
	@echo "  make docker-up     - Start MySQL and phpMyAdmin containers"
	@echo "  make docker-down   - Stop all containers"
	@echo "  make docker-logs   - View Docker container logs"
	@echo "  make db-reset      - Reset database (drop and recreate)"
	@echo ""
	@echo "Development:"
	@echo "  make install       - Install all dependencies"
	@echo "  make dev           - Start development server"
	@echo "  make build         - Build for production"
	@echo "  make start         - Start production server"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean         - Remove node_modules and build artifacts"
	@echo ""

# Docker commands
docker-up:
	@echo "Starting Docker containers..."
	cd docker && docker-compose up -d
	@echo ""
	@echo "✅ Docker containers started!"
	@echo ""
	@echo "MySQL: localhost:3306"
	@echo "phpMyAdmin: http://localhost:8080"
	@echo ""

docker-down:
	@echo "Stopping Docker containers..."
	cd docker && docker-compose down
	@echo "✅ Containers stopped."

docker-logs:
	cd docker && docker-compose logs -f

db-reset:
	@echo "Resetting database..."
	cd docker && docker-compose down -v
	cd docker && docker-compose up -d
	@echo "✅ Database reset complete!"

# Development commands
install:
	@echo "Installing dependencies..."
	cd apps/web && npm install
	@echo "✅ Dependencies installed!"

dev:
	@echo "Starting development server..."
	cd apps/web && npm run dev

build:
	@echo "Building for production..."
	cd apps/web && npm run build

start:
	@echo "Starting production server..."
	cd apps/web && npm run start

# Cleanup
clean:
	@echo "Cleaning build artifacts..."
	rm -rf apps/web/.next
	rm -rf apps/web/node_modules
	@echo "✅ Cleanup complete!"
