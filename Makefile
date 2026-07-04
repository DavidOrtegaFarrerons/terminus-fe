.PHONY: help install dev dev-mock build docker docker-mock down clean

help:
	@echo "Terminus frontend"
	@echo ""
	@echo "Local (needs node 20+):"
	@echo "  make install      npm install"
	@echo "  make dev          vite dev server, real API on :8080 / :8081"
	@echo "  make dev-mock     vite dev server, in-app mock (no backend needed)"
	@echo "  make build        typecheck + production build to app/dist"
	@echo ""
	@echo "Docker:"
	@echo "  make docker       docker compose up, real API expected"
	@echo "  make docker-mock  docker compose up with VITE_MOCK=true"
	@echo "  make down         docker compose down"
	@echo "  make clean        docker compose down + remove images/volumes"

install:
	cd app && npm install

dev:
	cd app && npm run dev

dev-mock:
	cd app && VITE_MOCK=true npm run dev

build:
	cd app && npm run build

docker:
	VITE_MOCK=false docker compose up --build

docker-mock:
	VITE_MOCK=true docker compose up --build

down:
	docker compose down

clean:
	docker compose down -v --rmi local
