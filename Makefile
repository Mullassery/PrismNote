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

build: frontend-build
	cargo build --release

# The backend embeds the compiled frontend into the binary (see
# crates/server/src/main.rs), so the frontend must be built first or the
# release binary would serve no UI. This is the actual root cause of
# "make build fails" reports in the wild: running `cargo build --release`
# directly, without this target, skips the frontend build.
frontend-build:
	cd frontend && npm ci && npm run build

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
