.PHONY: install install-dev build dev test lint fmt clean help setup-hooks

help:
	@echo "prismnote development tasks:"
	@echo "  make install         Install pre-commit hooks"
	@echo "  make dev             Run backend + frontend dev servers"
	@echo "  make build           Build release backend binary"
	@echo "  make test            Run all tests"
	@echo "  make lint            Run clippy + ruff linter"
	@echo "  make fmt             Format code"
	@echo "  make fmt-check       Check format without changing"
	@echo "  make clean           Remove build artifacts"

install: setup-hooks
	@echo "✓ Development environment ready"

setup-hooks:
	@command -v pre-commit >/dev/null 2>&1 || pip install pre-commit
	pre-commit install

dev:
	@echo "Starting backend (PID in window 1)..."
	@echo "Start frontend with: cd frontend && npm install && npm run dev"
	cargo run

build:
	cargo build --release

test:
	cargo test --workspace --release

lint:
	cargo clippy --all-targets
	ruff check .
	cd frontend && npm run lint 2>/dev/null || echo "lint script not configured"

fmt:
	cargo fmt --all
	ruff format .
	cd frontend && prettier --write . 2>/dev/null || echo "prettier not configured"

fmt-check:
	cargo fmt --all -- --check
	ruff format --check .

clean:
	cargo clean
	rm -rf frontend/dist
