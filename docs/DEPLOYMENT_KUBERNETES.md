# Deploying PrismNote on Kubernetes

Deploy PrismNote to any Kubernetes cluster (EKS, GKE, AKS, self-hosted) using manifests or Helm.

## Prerequisites

- Kubernetes cluster (1.24+) with kubectl access
- Docker image pushed to a registry (ECR, GCR, Docker Hub, etc.)
- `kubectl` configured to access your cluster
- `helm` 3.0+ (optional, for Helm charts)

## Architecture Overview

PrismNote on Kubernetes consists of:
- **Deployment:** Frontend + Backend in one pod
- **Service:** ClusterIP (internal) + LoadBalancer (external)
- **PersistentVolumeClaim:** Notebook storage
- **ConfigMap:** Non-secret configuration
- **Secret:** API keys and credentials
- **Ingress:** TLS termination, custom domain
- **HorizontalPodAutoscaler:** Auto-scale on CPU/memory

## Manifest-Based Deployment

### Step 1: Create Namespace

```bash
kubectl create namespace prismnote
```

### Step 2: Create ConfigMap (Non-Secret Config)

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prismnote-config
  namespace: prismnote
data:
  NODE_ENV: "production"
  PRISMNOTE_LOG_LEVEL: "INFO"
  PRISMNOTE_JUPYTER_TIMEOUT: "300"
```

Apply: `kubectl apply -f configmap.yaml`

### Step 3: Create Secret (Credentials)

```bash
# Create from CLI
kubectl create secret generic prismnote-secrets \
  --from-literal=OPENAI_API_KEY=sk-... \
  --from-literal=DB_PASSWORD=... \
  -n prismnote
```

Or via manifest:

```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: prismnote-secrets
  namespace: prismnote
type: Opaque
stringData:
  OPENAI_API_KEY: sk-your-key
  DB_PASSWORD: secure-password
```

### Step 4: Create PersistentVolumeClaim

```yaml
# pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: prismnote-notebooks
  namespace: prismnote
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
  # storageClassName: fast-ssd  # Uncomment to use specific storage class
```

### Step 5: Create Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prismnote
  namespace: prismnote
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
      serviceAccountName: prismnote  # Use if RBAC enabled
      containers:
      - name: prismnote
        image: your-registry.com/prismnote:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 8000
          name: api
        - containerPort: 5173
          name: frontend
        
        # Environment from ConfigMap and Secret
        envFrom:
        - configMapRef:
            name: prismnote-config
        - secretRef:
            name: prismnote-secrets
        
        # Mount persistent storage
        volumeMounts:
        - name: notebooks
          mountPath: /notebooks
        
        # Resource requests/limits
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        
        # Health checks
        livenessProbe:
          httpGet:
            path: /api/health
            port: 8000
          initialDelaySeconds: 60
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        
        readinessProbe:
          httpGet:
            path: /api/health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 5
      
      volumes:
      - name: notebooks
        persistentVolumeClaim:
          claimName: prismnote-notebooks
```

### Step 6: Create Service

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: prismnote
  namespace: prismnote
  labels:
    app: prismnote
spec:
  type: LoadBalancer  # or ClusterIP if using Ingress
  selector:
    app: prismnote
  ports:
  - name: api
    port: 8000
    targetPort: 8000
  - name: frontend
    port: 5173
    targetPort: 5173
```

### Step 7: Create Ingress (Optional, for TLS/Custom Domain)

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: prismnote
  namespace: prismnote
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx  # or your ingress controller
  tls:
  - hosts:
    - prismnote.example.com
    secretName: prismnote-tls
  rules:
  - host: prismnote.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: prismnote
            port:
              number: 5173  # Frontend
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: prismnote
            port:
              number: 8000  # API
```

### Step 8: Create HorizontalPodAutoscaler

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: prismnote-hpa
  namespace: prismnote
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: prismnote
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Deploy Everything

```bash
kubectl apply -f configmap.yaml
kubectl apply -f secret.yaml
kubectl apply -f pvc.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f hpa.yaml
kubectl apply -f ingress.yaml

# Verify
kubectl get all -n prismnote
kubectl get pvc -n prismnote
```

## Helm Chart Deployment

### Create Helm Chart Structure

```bash
helm create prismnote-chart

# Update values.yaml with defaults
# Update templates/ with Kubernetes manifests
# Package: helm package prismnote-chart
```

### Deploy via Helm

```bash
helm install prismnote ./prismnote-chart \
  --namespace prismnote \
  --create-namespace \
  --values custom-values.yaml
```

## RBAC (Role-Based Access Control)

If RBAC is enabled, create a service account:

```yaml
# rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: prismnote
  namespace: prismnote
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: prismnote
  namespace: prismnote
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: prismnote
  namespace: prismnote
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: prismnote
subjects:
- kind: ServiceAccount
  name: prismnote
  namespace: prismnote
```

## TLS with cert-manager

### Install cert-manager

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.12.0/cert-manager.yaml
```

### Create ClusterIssuer (Let's Encrypt)

```yaml
# issuer.yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```

Apply and reference in Ingress (see above).

## Storage Options

### Local Storage (Dev/Test)

```yaml
# Uses node's local disk — no replication, pod-local
volumeMounts:
- name: notebooks
  mountPath: /notebooks
volumes:
- name: notebooks
  emptyDir: {}
```

### NFS (Shared Network Storage)

```yaml
volumes:
- name: notebooks
  nfs:
    server: nfs.example.com
    path: /exports/prismnote
```

### Cloud Storage (AWS EBS, GCP PD, Azure Disk)

```yaml
# AWS EBS example
volumes:
- name: notebooks
  awsElasticBlockStore:
    volumeID: vol-1234567890abcdef0
    fsType: ext4
```

### StatefulSet (if pod needs stable hostname)

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: prismnote
  namespace: prismnote
spec:
  serviceName: prismnote-headless
  replicas: 1
  selector:
    matchLabels:
      app: prismnote
  template:
    # ... same as Deployment pod spec ...
  volumeClaimTemplates:
  - metadata:
      name: notebooks
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 100Gi
```

## Monitoring & Logging

### Prometheus Metrics (if exposed by app)

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: prismnote
  namespace: prismnote
spec:
  selector:
    matchLabels:
      app: prismnote
  endpoints:
  - port: metrics
    interval: 30s
```

### View Logs

```bash
# Single pod
kubectl logs -n prismnote <pod-name>

# All pods
kubectl logs -n prismnote -l app=prismnote --all-containers=true

# Follow (tail -f equivalent)
kubectl logs -n prismnote -f <pod-name>

# Previous crashed container
kubectl logs -n prismnote <pod-name> --previous
```

### Port Forwarding (Local Debug)

```bash
# Access pod directly from localhost
kubectl port-forward -n prismnote <pod-name> 8000:8000 5173:5173

# Then visit http://localhost:5173
```

## Useful Commands

```bash
# Check deployment status
kubectl rollout status deployment/prismnote -n prismnote

# View recent events
kubectl describe deployment prismnote -n prismnote

# Scale manually
kubectl scale deployment prismnote --replicas 5 -n prismnote

# Restart pods
kubectl rollout restart deployment/prismnote -n prismnote

# View resource usage
kubectl top pods -n prismnote
kubectl top nodes

# Get shell into pod (for debugging)
kubectl exec -it <pod-name> -n prismnote -- /bin/bash

# Copy files from pod
kubectl cp prismnote/<pod-name>:/notebooks/file.ipynb ./local-file.ipynb
```

## Troubleshooting

### Pod pending

```bash
kubectl describe pod <pod-name> -n prismnote
# Check: resource requests, node capacity, affinity rules
```

### Pod crashing

```bash
kubectl logs <pod-name> -n prismnote
kubectl logs <pod-name> -n prismnote --previous  # Check if previous incarnation crashed
```

### ImagePullBackOff

```bash
# Image not found or registry auth failed
kubectl describe pod <pod-name> -n prismnote

# Create pull secret if private registry
kubectl create secret docker-registry regcred \
  --docker-server=<registry-url> \
  --docker-username=<username> \
  --docker-password=<password> \
  -n prismnote

# Update Deployment to use it:
# imagePullSecrets:
# - name: regcred
```

### PVC not binding

```bash
kubectl describe pvc prismnote-notebooks -n prismnote
# Check: storage class exists, node capacity, access modes
```

## Cost Breakdown

| Item | Cost/month |
|------|-----------|
| 3-node cluster (t3.large on AWS EKS) | $180 |
| EBS storage (100GB) | $10 |
| LoadBalancer | $16 |
| Data egress | $5 |
| **Total** | **~$211** |

Use **node auto-scaling** and **Spot instances** for 30-50% cost savings.

## Next Steps

- Set up **CI/CD** (GitOps with ArgoCD or Flux)
- Add **network policies** (restrict traffic between pods)
- Configure **pod security policies** (runtime security)
- Implement **backup/restore** (Velero)
