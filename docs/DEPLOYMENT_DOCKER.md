# Deploying PrismNote with Docker

Docker is the fastest way to get PrismNote running in any environment — single machine, cloud, or Kubernetes.

## Prerequisites

- Docker Desktop or Docker Engine (v20.10+)
- Docker Compose (v2.0+) — included with Docker Desktop
- ~2GB free disk space for the image
- Port 8000 (API) and 5173 (frontend) available

## Quick Start (5 minutes)

```bash
docker compose up -d
# Wait ~30 seconds for services to start
open http://localhost:5173
```

The default `docker-compose.yml` includes:
- **Frontend:** React dev server on port 5173
- **Backend:** Python kernel + API on port 8000
- **Data:** Persistent volume at `./notebooks/`

## Building the Docker Image

```bash
docker build -t prismnote:latest .
```

The `Dockerfile` is optimized with multi-stage builds:
1. **Stage 1 (frontend):** Node.js build → minified bundle
2. **Stage 2 (backend):** Python slim + maturin-built PyO3 extensions
3. **Final image:** ~850MB, combined frontend + backend

## Running with Docker Compose

### Development (with hot reload)

```bash
docker compose up
# Ctrl+C to stop
```

Logs stream to stdout. Frontend dev server hot-reloads on code changes.

### Production Mode

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

The production override:
- Uses the built image (no source code mounted)
- Disables hot reload
- Sets `NODE_ENV=production` (Vue minified)
- Runs as non-root user
- Enables health checks

## Running Standalone

```bash
docker run -d \
  --name prismnote \
  -p 8000:8000 \
  -p 5173:5173 \
  -v prismnote-data:/notebooks \
  -e PRISMNOTE_API_URL=http://localhost:8000 \
  prismnote:latest

# View logs
docker logs -f prismnote

# Stop
docker stop prismnote
docker rm prismnote
```

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PRISMNOTE_API_URL` | `http://localhost:8000` | Backend API endpoint (set to your cloud domain in production) |
| `PRISMNOTE_JUPYTER_TIMEOUT` | `300` | Kernel execution timeout (seconds) |
| `PRISMNOTE_MAX_OUTPUT_SIZE` | `10485760` | Max cell output size (bytes) |
| `PRISMNOTE_DATABASE_URL` | (none) | PostgreSQL/SQLite path for metadata (optional) |
| `PRISMNOTE_LOG_LEVEL` | `INFO` | Logging level (DEBUG, INFO, WARNING, ERROR) |
| `NODE_ENV` | `development` | Frontend mode (development, production) |
| `VITE_API_URL` | (same as `PRISMNOTE_API_URL`) | Frontend API endpoint |

### Example: Custom timeout and logging

```bash
docker run -d \
  -p 8000:8000 -p 5173:5173 \
  -v prismnote-data:/notebooks \
  -e PRISMNOTE_JUPYTER_TIMEOUT=600 \
  -e PRISMNOTE_LOG_LEVEL=DEBUG \
  prismnote:latest
```

## Persistent Storage

### Using Docker Volumes (Recommended)

```bash
# Create a named volume
docker volume create prismnote-data

# Use it in a container
docker run -v prismnote-data:/notebooks prismnote:latest

# List volumes
docker volume ls
docker volume inspect prismnote-data
```

### Using Bind Mounts (File System)

```bash
# Mount a local directory (backups survive container deletion)
docker run -v /path/to/notebooks:/notebooks prismnote:latest
```

Bind mounts are better for local development; volumes are better for production (managed by Docker).

## Health Checks

The container exposes a health check endpoint at `GET /api/health`:

```bash
curl http://localhost:8000/api/health
# Response: { "status": "ok", "kernel": "ready" }
```

Docker Compose health check (configured in `docker-compose.yml`):

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
  interval: 10s
  timeout: 5s
  retries: 3
  start_period: 30s
```

## Troubleshooting

### Port already in use

```bash
# Find the process using port 8000
lsof -i :8000
# Or with Docker (see which container has the port)
docker ps --format "table {{.Names}}\t{{.Ports}}"

# Use a different port
docker run -p 9000:8000 -p 5174:5173 prismnote:latest
# Access at http://localhost:5174
```

### Permission denied on macOS

If you get `permission denied while trying to connect to Docker daemon`:

```bash
# Add yourself to the docker group (requires restart)
sudo usermod -aG docker $USER
newgrp docker

# Or use sudo
sudo docker run prismnote:latest
```

### Out of memory

```bash
# Increase Docker resource limits (Docker Desktop)
# Settings → Resources → Memory: increase to 4GB or more

# For Linux, the container has no hard limit by default.
# Limit memory per container:
docker run -m 2g prismnote:latest
```

### Kernel not starting

If cells don't execute:

```bash
# Check kernel logs
docker logs prismnote | grep kernel

# Verify the kernel binary is present
docker exec prismnote python -m ipykernel --version

# Rebuild if kernel wasn't installed correctly
docker build --no-cache -t prismnote:latest .
```

### Hot reload not working

If frontend changes aren't reflected:

```bash
# Ensure the source code is mounted (development mode only)
docker compose up  # Uses default docker-compose.yml with src/ mounted

# Check the mount
docker inspect <container-id> | grep -A 10 Mounts

# Restart with fresh build
docker compose down -v
docker compose up --build
```

## Networking

### Docker Compose (same network)

Services within `docker-compose.yml` can reach each other by hostname:
- Frontend → Backend: `http://prismnote-api:8000` (DNS resolves automatically)
- Backend environment: `PRISMNOTE_JUPYTER_TIMEOUT`, etc.

### Standalone Containers

```bash
# Create a network
docker network create prismnote-net

# Run backend
docker run --network prismnote-net --name prismnote-api ...

# Run frontend (frontend needs to know backend's IP or use Docker DNS)
docker run --network prismnote-net \
  -e VITE_API_URL=http://prismnote-api:8000 \
  prismnote-frontend
```

### External Access

By default, containers listen on localhost. For external access (from other machines):

```bash
# Bind to all interfaces (0.0.0.0)
docker run -p 0.0.0.0:8000:8000 prismnote:latest

# Now accessible from other machines at http://<host-ip>:8000
# Find your IP: ip addr show (Linux) or ifconfig (macOS)
```

## Performance Tuning

### Build Optimizations

```bash
# Use BuildKit for faster builds (2-3x faster)
export DOCKER_BUILDKIT=1
docker build -t prismnote:latest .

# Build with specific Python version
docker build \
  --build-arg PYTHON_VERSION=3.12 \
  -t prismnote:latest .
```

### Runtime Optimizations

```bash
# CPU limits (useful on shared hosts)
docker run -c 1024 prismnote:latest  # Use 1 CPU

# I/O performance: use tmpfs for temporary files
docker run --tmpfs /tmp:rw,size=1g prismnote:latest

# Memory limit with swap
docker run -m 2g --memory-swap 4g prismnote:latest
```

## Security

### Running as Non-Root

The Dockerfile includes a `prismnote` user (UID 1000):

```dockerfile
RUN useradd -m -u 1000 prismnote
USER prismnote
```

To enforce this:

```bash
docker run --user prismnote prismnote:latest
```

### Read-Only File System

```bash
docker run --read-only \
  --tmpfs /tmp \
  --tmpfs /var/cache \
  prismnote:latest
```

### Network Isolation

```bash
# Run without network access (for testing)
docker run --network none prismnote:latest

# Or create a restricted network
docker network create --driver bridge --opt com.docker.network.bridge.enable_icc=false restricted
docker run --network restricted prismnote:latest
```

## Monitoring & Logs

### Docker Logs

```bash
# Tail logs
docker logs -f prismnote

# Limit to last 100 lines
docker logs -n 100 prismnote

# Show timestamps
docker logs -t prismnote

# Since a specific time
docker logs --since 2 hours prismnote
```

### Structured Logs (JSON)

Set `PRISMNOTE_LOG_FORMAT=json` to get JSON-formatted logs (easier to parse):

```bash
docker run \
  -e PRISMNOTE_LOG_FORMAT=json \
  prismnote:latest

# Parse with jq
docker logs prismnote | jq '.level, .message'
```

### Resource Usage

```bash
# Real-time stats (CPU, memory, I/O)
docker stats prismnote

# Once snapshot
docker stats --no-stream prismnote
```

## Cleanup

```bash
# Stop and remove a container
docker stop prismnote && docker rm prismnote

# Remove the image
docker rmi prismnote:latest

# Remove unused data (dangling images, volumes, networks)
docker system prune

# Remove everything (including volumes — WARNING: loses data)
docker system prune -a --volumes
```

## Next Steps

- **[AWS ECS Deployment](DEPLOYMENT_AWS.md)** — Scale to multiple containers
- **[Kubernetes](DEPLOYMENT_KUBERNETES.md)** — Multi-zone high availability
- **[Docker best practices](https://docs.docker.com/develop/dev-best-practices/)** — Official Docker guidance
