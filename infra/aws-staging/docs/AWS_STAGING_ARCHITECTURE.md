# AWS WINMAR CHAIN Faucet — Centralized Staging Architecture

**Proposal / not deployed.** Start with one isolated, private staging instance in AWS Singapore, then split services when traffic grows. No mainnet WMC claim or contract deployment is authorized.

## Stage A — controlled private AWS

1. EC2 Amazon Linux 2023 in an existing, reviewed private subnet. Initial `t3.medium` and 40 GiB encrypted gp3 EBS are sizing **estimates**, not measured requirements or a cloud price quote.
2. No public IP or inbound security-group ingress. Administration only by SSM Session Manager with explicitly approved IAM and VPC endpoints or controlled NAT for SSM access. Firewall and route-table inspection are the AWS operator's responsibility.
3. Application Faucet remains `WMC_ENABLE_LIVE_CLAIMS=disabled`. No relayer key, Redis credentials, approved mainnet Faucet address or WMC balance is created by these files.
4. Local preview (elsewhere in repository) uses Unix socket and a localhost Redis test service. The AWS Terraform blueprint provisions only an instance and its minimal SSM identity. **It does not install or start the Faucet stack**, TLS, reverse proxy, Redis, backups, monitoring alarms or other live components.
5. CI performs Terraform format/syntax checks without running a plan or apply. A green CI is not evidence that the infrastructure has been provisioned, audited or secured end to end.

## Security and data durability requirements

- Dedicated AWS account or clearly segregated environment; least-privilege operator access, audit logs, budget alarms and centrally managed encrypted remote Terraform state.
- Before any external client route: verified Cloudflare edge chain, origin firewall, trusted IP stripping and private Unix socket; direct-origin bypass and header spoof tests.
- Before durable nonce production: TLS/ACL Redis with AOF, noeviction, recovery rehearsals and monitoring. Do not discard unknown transaction journals or reuse signing nonces after restarts.
- Before live WMC claims: separated external signer/key custody, reconciliation runbook, smart-contract audit, emergency halt rehearsal, capped funding and explicit go/no-go.

## Scale-out plan

- ECS/Fargate for horizontally scalable stateless challenge/API endpoints after proxy + Redis review.
- Managed Redis/Valkey with verified data migration preserving non-expiring pending journals and the per-wallet cooldown. Confirm persistence compatibility before switching.
- Separate singleton signing/transaction queue worker; no active-active signing based only on a nonce manager.
- CloudWatch metrics and AWS Backup with restore testing; incident-response and change approvals.

## Hard stops

**No AWS apply, DNS, public load balancer, validator change, treasury transfer, relayer secret, signer activation or mainnet faucet funding from this review PR.**