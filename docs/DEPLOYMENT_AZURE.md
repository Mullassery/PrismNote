# Deploying PrismNote on Microsoft Azure

Deploy PrismNote on Azure using Container Instances (serverless), App Service, or Azure Kubernetes Service (AKS).

## Architecture Decision

| Service | Best For | Cost (monthly) | Setup |
|---------|----------|----------------|-------|
| **Container Instances** | Stateless, simple, dev/test | $10-50 | 5 min |
| **App Service** | Easy scaling, integrated CI/CD | $30-200 | 15 min |
| **AKS** | Complex workloads, multi-zone | $150-500 | 45 min |

**Recommendation:** App Service for most deployments.

## Prerequisites

- Azure subscription (free tier available)
- Azure CLI (`az login`)
- Docker image built

## Quick Deploy to Container Instances

```bash
# Create resource group
az group create --name prismnote-rg --location eastus

# Create container registry
az acr create --resource-group prismnote-rg --name prismnoteacr --sku Basic

# Push image
az acr build --registry prismnoteacr --image prismnote:latest .

# Deploy to Container Instances
az container create \
  --resource-group prismnote-rg \
  --name prismnote \
  --image prismnoteacr.azurecr.io/prismnote:latest \
  --cpu 2 --memory 2 \
  --ports 8000 \
  --ip-address public \
  --environment-variables NODE_ENV=production \
  --registry-login-server prismnoteacr.azurecr.io \
  --registry-username <username> \
  --registry-password <password>

# Get public IP
az container show --resource-group prismnote-rg --name prismnote --query ipAddress.ip
```

## Deploying to App Service

### Step 1: Create App Service Plan

```bash
az appservice plan create \
  --name prismnote-plan \
  --resource-group prismnote-rg \
  --sku B2 \
  --is-linux

# Sku options: B1 (free), B2 ($18/mo), S1 ($50/mo)
```

### Step 2: Create Web App

```bash
az webapp create \
  --resource-group prismnote-rg \
  --plan prismnote-plan \
  --name prismnote-app \
  --deployment-container-image-name prismnoteacr.azurecr.io/prismnote:latest
```

### Step 3: Configure Container Registry Access

```bash
# Get registry credentials
az acr credential show --name prismnoteacr --resource-group prismnote-rg

# Set credentials in App Service
az webapp config container set \
  --name prismnote-app \
  --resource-group prismnote-rg \
  --docker-custom-image-name prismnoteacr.azurecr.io/prismnote:latest \
  --docker-registry-server-url https://prismnoteacr.azurecr.io \
  --docker-registry-server-user <username> \
  --docker-registry-server-password <password>
```

### Step 4: Configure Environment Variables

```bash
az webapp config appsettings set \
  --name prismnote-app \
  --resource-group prismnote-rg \
  --settings \
    NODE_ENV=production \
    PRISMNOTE_JUPYTER_TIMEOUT=300 \
    WEBSITES_PORT=8000
```

### Step 5: Enable Continuous Deployment

```bash
# Via Azure DevOps or GitHub Actions
az webapp deployment github-actions add \
  --repo-url https://github.com/username/prismnote \
  --branch main \
  --name prismnote-app \
  --resource-group prismnote-rg
```

## Persistent Storage with Azure Files

### Option 1: Blob Storage (recommended for cloud)

```bash
# Create storage account
az storage account create \
  --name prismnotedata \
  --resource-group prismnote-rg \
  --location eastus

# Create container
az storage container create --account-name prismnotedata --name notebooks

# Set connection string in app
az webapp config appsettings set \
  --name prismnote-app \
  --resource-group prismnote-rg \
  --settings AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;..."
```

### Option 2: Azure Files Share (NFS mount)

```bash
# Create file share
az storage share create --account-name prismnotedata --name notebooks --quota 100

# Mount in AKS pods (via persistent volumes)
```

## Deploying to AKS (Azure Kubernetes Service)

### Step 1: Create AKS Cluster

```bash
az aks create \
  --resource-group prismnote-rg \
  --name prismnote-aks \
  --node-count 3 \
  --vm-set-type VirtualMachineScaleSets \
  --load-balancer-sku standard \
  --enable-managed-identity

# Get credentials
az aks get-credentials --name prismnote-aks --resource-group prismnote-rg
```

### Step 2: Deploy via Helm or kubectl

See [DEPLOYMENT_KUBERNETES.md](DEPLOYMENT_KUBERNETES.md) for Kubernetes manifests.

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `NODE_ENV` | `development` | App mode |
| `PRISMNOTE_JUPYTER_TIMEOUT` | `300` | Kernel timeout (s) |
| `WEBSITES_PORT` | `8000` | Port for App Service |
| `AZURE_STORAGE_CONNECTION_STRING` | (none) | Blob Storage access |

## Managed Identity (Secure Credential Access)

```bash
# Create managed identity
az identity create \
  --name prismnote-identity \
  --resource-group prismnote-rg

# Assign to App Service
az webapp identity assign \
  --name prismnote-app \
  --resource-group prismnote-rg

# Grant access to storage
az role assignment create \
  --assignee <principal-id> \
  --role "Storage Blob Data Contributor" \
  --scope /subscriptions/<sub-id>/resourceGroups/prismnote-rg/providers/Microsoft.Storage/storageAccounts/prismnotedata
```

## Cost Breakdown

### Container Instances
- 2 cores × 2GB RAM × 730 hours: ~$50/month
- Storage: ~$5/month
- **Total: ~$55/month**

### App Service (B2)
- Compute: $18/month
- Storage: ~$5/month
- **Total: ~$23/month**

### AKS
- 3-node cluster (Standard_D2s_v3): ~$200/month
- Storage: ~$10/month
- **Total: ~$210/month**

## Monitoring

```bash
# View App Service logs
az webapp log tail --name prismnote-app --resource-group prismnote-rg

# Enable Application Insights
az monitor app-insights component create \
  --app prismnote-insights \
  --location eastus \
  --resource-group prismnote-rg
```

## Troubleshooting

### Container won't start in App Service

```bash
# Check logs
az webapp log tail --name prismnote-app --resource-group prismnote-rg

# Verify port mapping (must be 8000 in container, set WEBSITES_PORT=8000)
```

### AKS pod crashes

```bash
kubectl logs <pod-name>
kubectl describe pod <pod-name>
```

## Next Steps

- [AWS Deployment](DEPLOYMENT_AWS.md)
- [GCP Deployment](DEPLOYMENT_GCP.md)
- [Kubernetes](DEPLOYMENT_KUBERNETES.md)
