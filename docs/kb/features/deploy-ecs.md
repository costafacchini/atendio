# Deploy — AWS ECS (Fargate)

**Last Updated**: 2026-08-12
**Context**: Steps to deploy atendio on AWS ECS Fargate with the multi-provider scaler.

> **Note**: The `ECSScaler` implementation has not been tested in a live AWS ECS production environment.
> Treat this as a validated design; verify IAM permissions and service names in a staging environment first.

---

## Prerequisites

- AWS CLI configured (`aws configure`)
- Docker image pushed to ECR
- RDS PostgreSQL instance
- ElastiCache Redis cluster
- S3 bucket for file uploads (already in use)
- IAM role with ECS task permissions

---

## Architecture on ECS

| ECS Entity | Role |
|------------|------|
| `atendio-web` service | Express API + SPA, always running, behind an ALB |
| `atendio-scaler` service (desiredCount: 1) | Runs the scaler process |
| `atendio-worker` service | BullMQ workers — `desiredCount` managed by the scaler |

The `ECSScaler` calls `UpdateService` on the `atendio-worker` service, adjusting `desiredCount` directly.
Unlike the Heroku/Fly approach (1 dyno per worker type), ECS scales a single service with N identical tasks.

---

## Required env vars / secrets

```bash
# Infrastructure
REDIS_URL=redis://...
DATABASE_URL=postgres://...

# Scaler
DEPLOY_PROVIDER=ecs
ECS_CLUSTER=atendio-cluster
ECS_SERVICE=atendio-worker
AWS_DEFAULT_REGION=us-east-1   # already used by the S3 integration

# App
SECRET=...
APP_URL=https://your-domain.com
NODE_ENV=production
WORKER_MAX=15
```

Store secrets in AWS Secrets Manager or SSM Parameter Store and inject them into task definitions via `secrets` or `environment`.

---

## Deploy steps

```bash
# 1. Create ECR repository and push image
aws ecr create-repository --repository-name atendio
aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
docker build -t atendio .
docker tag atendio:latest <account>.dkr.ecr.<region>.amazonaws.com/atendio:latest
docker push <account>.dkr.ecr.<region>.amazonaws.com/atendio:latest

# 2. Create the ECS cluster
aws ecs create-cluster --cluster-name atendio-cluster

# 3. Register task definitions (web, scaler, worker)
#    Each definition uses the same image with different CMD overrides:
#    web:    ["node", "--require", "source-map-support/register", "dist/server.js"]
#    scaler: ["node", "--require", "source-map-support/register", "dist/scaler.js"]
#    worker: ["node", "--require", "source-map-support/register", "dist/worker.js"]
aws ecs register-task-definition --cli-input-json file://task-def-web.json
aws ecs register-task-definition --cli-input-json file://task-def-scaler.json
aws ecs register-task-definition --cli-input-json file://task-def-worker.json

# 4. Create ECS services
aws ecs create-service \
  --cluster atendio-cluster \
  --service-name atendio-web \
  --task-definition atendio-web \
  --desired-count 1 \
  --launch-type FARGATE \
  --load-balancers targetGroupArn=<arn>,containerName=web,containerPort=5000

aws ecs create-service \
  --cluster atendio-cluster \
  --service-name atendio-scaler \
  --task-definition atendio-scaler \
  --desired-count 1 \
  --launch-type FARGATE

aws ecs create-service \
  --cluster atendio-cluster \
  --service-name atendio-worker \
  --task-definition atendio-worker \
  --desired-count 1 \
  --launch-type FARGATE

# 5. Run migrations (one-off task)
aws ecs run-task \
  --cluster atendio-cluster \
  --task-definition atendio-web \
  --overrides '{"containerOverrides":[{"name":"web","command":["npx","prisma","migrate","deploy"]}]}'
```

---

## IAM policy for the scaler task

The scaler task needs permission to describe and update the worker service:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecs:DescribeServices",
        "ecs:UpdateService"
      ],
      "Resource": "arn:aws:ecs:<region>:<account>:service/atendio-cluster/atendio-worker"
    }
  ]
}
```

---

## Scaler tuning

Same env vars as Heroku — `WORKER_MAX`, `BACKLOG_STEP`, `UP_COOLDOWN_MS`, etc.

The key difference: ECS scales tasks within one service (`desiredCount`), not individual machines.
ECS Fargate takes 30–90 seconds to start a new task; set `UP_COOLDOWN_MS` accordingly (≥ 120000).

---

## Notes

- The AWS credentials used by the scaler come from the ECS task IAM role — no `AWS_ACCESS_KEY_ID` needed for the scaler itself (only for S3 file uploads).
- For a more managed approach, consider AWS Application Auto Scaling with a custom CloudWatch metric driven by the SQS/Redis queue depth — but the custom scaler gives finer control over the weighting logic.
