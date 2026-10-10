# WINMAR CHAIN — Centralized AWS Staging (Review Only)

**No AWS provisioning or mainnet changes are authorized or performed by this repository change.**

This Terraform blueprint is an initial, dedicated **private EC2 staging host**. Proposed region: Singapore (`ap-southeast-1`), subject to account owner approval. It uses an existing VPC and private subnet, a security group with no inbound rules, encrypted EBS, EC2 IMDSv2, and AWS Systems Manager (SSM) instead of SSH.

## Deployment boundary

- No public IP, inbound SSH/HTTP/Redis/RPC, DNS records, load balancer, validator key, Faucet contract address, relayer key or WMC treasury.
- The AWS operator must supply approved existing VPC/subnet identifiers and verify that SSM works over allowed NAT or approved private VPC endpoints.
- Source code has no real AWS credentials. Terraform local state and filled tfvars must never be committed. Operators must use an approved remote state backend with encryption, locking and restrictive IAM before provisioning.
- Neither Docker nor Redis nor Faucet is installed automatically. Existing local Redis staging and disabled API smoke tests remain at `infra/faucet-staging/`.
- Never use a QBFT validator key for Faucet. Even after infrastructure is provisioned, production claim flags stay disabled pending audit and approval.

## Validation (safe, no AWS deployment)

CI uses a pinned Terraform installer followed by `terraform fmt -check -recursive`, `terraform init -backend=false`, and `terraform validate`. `init` downloads the AWS provider for syntax validation only. It does not create resources. Run commands only from the Terraform directory.

## Operator-controlled future provisioning

An authorized Winmar AWS administrator must approve account, region, VPC, subnet, IAM permissions, cost owner, remote state, access logging, patch/backup policy and a Terraform execution plan. **Do not run `terraform apply` until the operator signs off.**

## Migration after scale

EC2 staging -> ECS/Fargate API, managed Redis/Valkey (preserve cooldown and unresolved transaction journals), dedicated non-validator signing worker, CloudWatch alarms and AWS Backup, with an independently reviewed, private Cloudflare/ALB ingress. A signer must never be horizontally scaled without nonce/idempotency redesign.

See `docs/AWS_STAGING_ARCHITECTURE.md` for constraints and release gates.
