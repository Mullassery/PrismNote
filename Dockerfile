# Frontend build stage
FROM node:18-alpine as frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .
RUN npm run build

# Backend build stage
FROM python:3.11-slim as backend-builder

WORKDIR /app

COPY pyproject.toml setup.py ./
RUN pip install --user --no-cache-dir --upgrade pip && \
    pip install --user --no-cache-dir .

# Runtime stage
FROM python:3.11-slim

WORKDIR /app

# Install Node for runtime if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Copy Python dependencies
COPY --from=backend-builder /root/.local /root/.local

# Copy frontend build
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Set environment variables
ENV PATH=/root/.local/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    NODE_ENV=production

# Copy application code
COPY prismnote /app/prismnote
COPY tests /app/tests

# Expose port
EXPOSE 5173 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import prismnote; print('OK')" || exit 1

# Default command
CMD ["python", "-m", "prismnote"]
