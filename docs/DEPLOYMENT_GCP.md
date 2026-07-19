# Deploying PrismNote on Google Cloud Platform

Deploy PrismNote to GCP using Cloud Run (serverless) or GKE (Kubernetes) for production workloads.

## Architecture Decision

| Service | Best For | Cost (monthly) | Setup Time |
|---------|----------|----------------|------------|
| **Cloud Run** | Stateless API, quick deploys, event-driven | $10-80 | 5 minutes |
| **GKE** | Stateful, complex networking, multi-region | $150-1000 | 45 minutes |

**Recommendation:** Cloud Run for quick start, GKE for production scale.

## Prerequisites

- GCP account with billing enabled
- `gcloud` CLI installed (`curl https://sdk.cloud.google.com | bash`)
- Docker image built: `docker build -t prismnote:latest .`

## Deploying to Cloud Run

### Step 1: Authenticate

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud auth configure-docker
```

### Step 2: Push to Artifact Registry

```bash
gcloud artifacts repositories create prismnote --location=us-central1 --repository-format=docker

# Tag image
docker tag prismnote:latest us-central1-docker.pkg.dev/PROJECT_ID/prismnote/prismnote:latest

# Push
docker push us-central1-docker.pkg.dev/PROJECT_ID/prismnote/prismnote:latest
```

### Step 3: Deploy to Cloud Run

```bash
gcloud run deploy prismnote \
  --image us-central1-docker.pkg.dev/PROJECT_ID/prismnote/prismnote:latest \
  --platform managed \
  --region us-central1 \
  --memory 2Gi \
  --cpu 2 \
  --timeout 600 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,PRISMNOTE_JUPYTER_TIMEOUT=300" \
  --max-instances 10

# Response includes service URL
```

### Step 4: Enable Persistent Storage (Cloud Storage)

```bash
# Create GCS bucket
gsutil mb -p PROJECT_ID gs://prismnote-notebooks

# Mount via FUSE (experimental) or use API calls in task code
gcloud run deploy prismnote \
  --image <image-uri> \
  --set-env-vars "PRISMNOTE_GCS_BUCKET=gs://prismnote-notebooks" \
  --update
```

### Step 5: Custom Domain

```bash
gcloud run domain-mappings create \
  --service prismnote \
  --domain prismnote.example.com \
  --region us-central1
```

Then update your DNS CNAME to the provided Cloud Run URL.

## Deploying to Google Kubernetes Engine (GKE)

### Step 1: Create Cluster

```bash
gcloud container clusters create prismnote-cluster \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type n1-standard-2 \
  --enable-autoscaling \
  --min-nodes 2 \
  --max-nodes 10 \
  --enable-ip-alias \
  --enable-autorepair \
  --enable-autoupgrade

# Get credentials
gcloud container clusters get-credentials prismnote-cluster --zone us-central1-a
```

### Step 2: Create Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prismnote
  labels:
    app: prismnote
spec:
  replicas: 2
  selector:
    matchLabels:
      app: prismnote
  template:
    metadata:
      labels:
        app: prismnote
    spec:
      containers:
      - name: prismnote
        image: us-central1-docker.pkg.dev/PROJECT_ID/prismnote/prismnote:latest
        ports:
        - containerPort: 8000
        env:
        - name: PRISMNOTE_JUPYTER_TIMEOUT
          value: "300"
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 8000
          initialDelaySeconds: 60
          periodSeconds: 10
```

### Step 3: Deploy

```bash
kubectl apply -f deployment.yaml

# Expose via LoadBalancer
kubectl expose deployment prismnote \
  --type LoadBalancer \
  --port 80 \
  --target-port 8000

# Get external IP
kubectl get service prismnote
```

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `NODE_ENV` | `development` | App mode (development, production) |
| `PRISMNOTE_JUPYTER_TIMEOUT` | `300` | Kernel execution timeout (seconds) |
| `PRISMNOTE_LOG_LEVEL` | `INFO` | Logging level |
| `PRISMNOTE_GCS_BUCKET` | (none) | GCS bucket for persistent storage |

## Cost Breakdown

### Cloud Run
- 1 million requests/month: ~$10 (first 2M free)
- 400,000 GB-seconds compute: ~$5 (included in above)
- **Total: ~$15-50/month**

### GKE
- 3-node cluster (n1-standard-2): ~$250/month
- Storage (100GB): ~$5/month
- Load Balancer: ~$18/month
- **Total: ~$270-350/month**

## Troubleshooting

### Cloud Run deployment fails

```bash
# Check build logs
gcloud builds log --stream

# Check service logs
gcloud run logs read prismnote --limit 50
```

### GKE pod not starting

```bash
# Check pod status
kubectl describe pod <pod-name>

# Check logs
kubectl logs <pod-name>

# Check resource availability
kubectl top nodes
```

## Next Steps

- [AWS Deployment](DEPLOYMENT_AWS.md)
- [Kubernetes](DEPLOYMENT_KUBERNETES.md)
