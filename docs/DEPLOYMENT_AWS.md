# Deploying PrismNote on AWS

Deploy PrismNote to AWS using ECS Fargate for serverless containers or EC2 for more control.

## Architecture Decision

| Approach | Best For | Cost (monthly) | Setup Time |
|----------|----------|----------------|------------|
| **ECS Fargate** | Managed, pay-per-request, auto-scaling | $50-300 | 20 minutes |
| **ECS EC2** | Persistent workload, reserved capacity | $100-500 | 30 minutes |
| **AppRunner** | CI/CD integration, GitHub push-to-deploy | $80-250 | 10 minutes |

**Recommendation:** Use ECS Fargate for most deployments (simplest, no ops).

## Prerequisites

- AWS account with permissions to create ECS, ECR, ALB, IAM roles
- AWS CLI v2 (install via `curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" | unzip -`)
- Docker image built locally: `docker build -t prismnote:latest .`

## Step 1: Create ECR Repository

```bash
aws ecr create-repository --repository-name prismnote --region us-east-1
# Response: { "repository": { "repositoryUri": "123456789.dkr.ecr.us-east-1.amazonaws.com/prismnote" } }

# Save this URI
export ECR_URI="123456789.dkr.ecr.us-east-1.amazonaws.com/prismnote"
```

## Step 2: Push Image to ECR

```bash
# Authenticate Docker with ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $ECR_URI

# Tag and push
docker tag prismnote:latest $ECR_URI:latest
docker push $ECR_URI:latest

# Verify
aws ecr describe-images --repository-name prismnote --region us-east-1
```

## Step 3: Create ECS Cluster

```bash
aws ecs create-cluster \
  --cluster-name prismnote-prod \
  --region us-east-1 \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1

# Response: { "cluster": { "clusterName": "prismnote-prod", "clusterArn": "arn:aws:..." } }
```

## Step 4: Create IAM Task Role

```bash
cat > /tmp/ecs-task-trust.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "ecs-tasks.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
EOF

aws iam create-role \
  --role-name prismnote-task-role \
  --assume-role-policy-document file:///tmp/ecs-task-trust.json

# Attach basic policy (for CloudWatch logs, ECR pull)
aws iam attach-role-policy \
  --role-name prismnote-task-role \
  --policy-arn arn:aws:iam::aws:policy/CloudWatchLogsFullAccess

aws iam attach-role-policy \
  --role-name prismnote-task-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
```

## Step 5: Create ECS Task Definition

```bash
cat > /tmp/prismnote-task.json <<'EOF'
{
  "family": "prismnote",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [{
    "name": "prismnote",
    "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/prismnote:latest",
    "portMappings": [{
      "containerPort": 8000,
      "protocol": "tcp"
    }],
    "environment": [
      { "name": "PRISMNOTE_LOG_LEVEL", "value": "INFO" },
      { "name": "PRISMNOTE_JUPYTER_TIMEOUT", "value": "300" },
      { "name": "NODE_ENV", "value": "production" }
    ],
    "logConfiguration": {
      "logDriver": "awslogs",
      "options": {
        "awslogs-group": "/ecs/prismnote",
        "awslogs-region": "us-east-1",
        "awslogs-stream-prefix": "ecs"
      }
    },
    "healthCheck": {
      "command": ["CMD-SHELL", "curl -f http://localhost:8000/api/health || exit 1"],
      "interval": 30,
      "timeout": 5,
      "retries": 3,
      "startPeriod": 60
    }
  }]
}
EOF

# Replace the image URI with your actual URI
sed -i "s|123456789.dkr.ecr.us-east-1.amazonaws.com/prismnote:latest|$ECR_URI:latest|" /tmp/prismnote-task.json

# Create log group first
aws logs create-log-group \
  --log-group-name /ecs/prismnote \
  --region us-east-1 || true

# Register task definition
aws ecs register-task-definition \
  --cli-input-json file:///tmp/prismnote-task.json \
  --region us-east-1
```

## Step 6: Create Application Load Balancer (ALB)

```bash
# Create security group for ALB
aws ec2 create-security-group \
  --group-name prismnote-alb-sg \
  --description "ALB for PrismNote" \
  --vpc-id vpc-12345678  # Replace with your VPC ID

export ALB_SG="sg-1234567890abcdef"

# Allow HTTP/HTTPS inbound
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Create ALB
aws elbv2 create-load-balancer \
  --name prismnote-alb \
  --subnets subnet-1 subnet-2 \
  --security-groups $ALB_SG \
  --region us-east-1

# Response includes LoadBalancerArn: arn:aws:elasticloadbalancing:...
export ALB_ARN="arn:aws:elasticloadbalancing:us-east-1:123456789:loadbalancer/app/prismnote-alb/1234567890abcdef"
```

## Step 7: Create Target Group

```bash
aws elbv2 create-target-group \
  --name prismnote-tg \
  --protocol HTTP \
  --port 8000 \
  --vpc-id vpc-12345678 \
  --health-check-path /api/health \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --region us-east-1

# Response includes TargetGroupArn
export TG_ARN="arn:aws:elasticloadbalancing:us-east-1:123456789:targetgroup/prismnote-tg/1234567890abcdef"
```

## Step 8: Register ALB Listener

```bash
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN \
  --region us-east-1
```

## Step 9: Create ECS Service

```bash
# Create security group for ECS tasks
aws ec2 create-security-group \
  --group-name prismnote-task-sg \
  --description "ECS tasks for PrismNote" \
  --vpc-id vpc-12345678

export TASK_SG="sg-abcdef1234567890"

# Allow inbound from ALB
aws ec2 authorize-security-group-ingress \
  --group-id $TASK_SG \
  --protocol tcp \
  --port 8000 \
  --source-security-group-id $ALB_SG

# Create the ECS service
aws ecs create-service \
  --cluster prismnote-prod \
  --service-name prismnote-service \
  --task-definition prismnote:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-1,subnet-2],securityGroups=[$TASK_SG],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$TG_ARN,containerName=prismnote,containerPort=8000" \
  --region us-east-1

# Response includes ServiceArn
# Verify: aws ecs describe-services --cluster prismnote-prod --services prismnote-service
```

## Step 10: Configure Auto-Scaling

```bash
# Create auto-scaling target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/prismnote-prod/prismnote-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10 \
  --region us-east-1

# Scale up on high CPU (>70%)
aws application-autoscaling put-scaling-policy \
  --policy-name cpu-scaling \
  --service-namespace ecs \
  --resource-id service/prismnote-prod/prismnote-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration \
    "TargetValue=70.0,PredefinedMetricSpecification={PredefinedMetricType=ECSServiceAverageCPUUtilization}" \
  --region us-east-1
```

## Persistent Storage with EFS

For notebooks to survive task restarts:

```bash
# Create EFS file system
aws efs create-file-system \
  --performance-mode generalPurpose \
  --throughput-mode bursting \
  --encrypted \
  --region us-east-1

export EFS_ID="fs-1234567890abcdef"

# Create mount targets in each subnet
aws efs create-mount-target \
  --file-system-id $EFS_ID \
  --subnet-id subnet-1 \
  --security-groups $TASK_SG

aws efs create-mount-target \
  --file-system-id $EFS_ID \
  --subnet-id subnet-2 \
  --security-groups $TASK_SG

# Update task definition to include EFS volume
# (Add to task definition JSON, then re-register)
```

Then update task definition with:
```json
"volumes": [{
  "name": "notebooks",
  "efsVolumeConfiguration": {
    "fileSystemId": "fs-1234567890abcdef",
    "rootDirectory": "/notebooks"
  }
}],
"containerDefinitions": [{
  "mountPoints": [{
    "sourceVolume": "notebooks",
    "containerPath": "/notebooks"
  }]
}]
```

## Environment Variables (Secrets Management)

For sensitive data (API keys, DB credentials), use AWS Secrets Manager:

```bash
# Store API key in Secrets Manager
aws secretsmanager create-secret \
  --name prismnote/api-key \
  --secret-string "sk-your-secret-key" \
  --region us-east-1

# Reference in task definition
"secrets": [{
  "name": "OPENAI_API_KEY",
  "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:prismnote/api-key"
}]
```

## Custom Domain & HTTPS

```bash
# Create/import ACM certificate for your domain
aws acm request-certificate \
  --domain-name prismnote.example.com \
  --validation-method DNS \
  --region us-east-1

# Add HTTPS listener to ALB
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:us-east-1:123456789:certificate/abc123 \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN

# Redirect HTTP → HTTPS
aws elbv2 modify-listener \
  --listener-arn <http-listener-arn> \
  --default-actions Type=redirect,RedirectConfig={Protocol=HTTPS,Port=443,StatusCode=HTTP_301}
```

## Monitoring & Logging

### CloudWatch Logs

Logs are automatically sent to `/ecs/prismnote` log group:

```bash
aws logs tail /ecs/prismnote --follow
```

### CloudWatch Metrics

View CPU, memory, and network metrics in the AWS Console:
- Services → CloudWatch → Dashboard
- Add widgets for ECS task CPU, memory, network

### Set Up Alarms

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name prismnote-high-cpu \
  --alarm-description "Alert if PrismNote CPU > 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789:my-topic
```

## Cost Breakdown (Monthly Estimate)

| Service | Usage | Cost |
|---------|-------|------|
| **ECS Fargate** | 2 tasks × 1024 CPU × 2048 MB × 730 hrs | $50 |
| **ECR** | 1 image × 0.5GB | $0.50 |
| **ALB** | 1 ALB + data | $16 |
| **EFS** (optional) | 10GB provisioned | $3 |
| **CloudWatch** | Logs + metrics | $5 |
| **Data transfer** | 100GB out | $9 |
| **Total** | | ~**$83/month** |

Use **Reserved Capacity** for 20-30% discount on long-term deployments.

## CI/CD Integration (GitHub Actions)

Automatically push updates on commit:

```yaml
name: Deploy to ECS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Build and push to ECR
        run: |
          aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_URI
          docker build -t $ECR_URI:$GITHUB_SHA .
          docker push $ECR_URI:$GITHUB_SHA
      
      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster prismnote-prod \
            --service prismnote-service \
            --force-new-deployment
```

## Troubleshooting

### Tasks failing to start

```bash
# Check task events
aws ecs describe-services --cluster prismnote-prod --services prismnote-service | \
  jq '.services[0].events | .[0:3]'

# Check logs
aws logs tail /ecs/prismnote --follow
```

### ALB health check failing

```bash
# Connect to task and test health endpoint manually
aws ecs describe-tasks --cluster prismnote-prod --tasks <task-id> | \
  jq '.tasks[0].containerInstanceArn'

# SSH into EC2 instance, then:
curl http://localhost:8000/api/health
```

### High costs

- Reduce desired count from 2 to 1 (during testing)
- Use Fargate Spot (50% cheaper, interruption risk)
- Use On-Demand for baseline, Spot for burst

## Next Steps

- **[Kubernetes (EKS)](DEPLOYMENT_KUBERNETES.md)** — Multi-zone, multi-region
- **[AWS best practices](https://aws.amazon.com/architecture/well-architected/)** — Production hardening
- **[Cost optimization](https://aws.amazon.com/cost-optimization/)** — Right-sizing instances
