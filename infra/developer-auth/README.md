# Winmar developer email and wallet-link service

This is an **unprovisioned** AWS Cognito + API Gateway + Lambda + DynamoDB design for the static Developer Tools site. It does not create AWS resources, configure DNS, or deploy the site. `terraform apply` requires a separate operator review and approval.

## User flow

1. A developer signs up or signs in through Cognito's hosted login using email and password. Cognito sends the email verification and password-reset messages.
2. The developer connects the creator wallet in the browser and chooses **Link creator wallet**.
3. API Gateway validates the Cognito JWT. The API issues a five-minute, one-use SIWE challenge for Winmar Chain ID `12142816`.
4. The wallet signs only the non-transactional link message. The API validates EOA signatures and EIP-1271 contract-wallet signatures, then atomically stores the wallet-to-Cognito-sub association.
5. A creator session can query its linked wallets. Private keys and seed phrases are never requested or sent to the API.

Linking a wallet is an identity association, not KYC, legal identity verification, token endorsement, or authorization to move funds. Token deployment still requires the creator's explicit wallet transaction and WMC gas. The smart contract remains publicly callable outside this UI; an email account is not an on-chain allowlist.

## Configuration boundaries

- The browser app client is public and has no client secret. OAuth uses authorization-code flow with PKCE.
- `developer_origin` must be the exact HTTPS origin that serves `developers.html`; Cognito callback/logout paths are fixed to `/developers.html`.
- `cognito_domain_prefix` is globally unique and must be chosen by the account owner.
- `config/developer-tools.json` intentionally keeps `developerAuth.enabled` false and all runtime IDs unset. Do not turn it on until the stack exists, the callback origin is confirmed, and end-to-end tests pass.
- The API only accepts the configured origin and verified Cognito email accounts. Wallet challenge TTL is five minutes; challenge consumption and wallet uniqueness are enforced by DynamoDB transaction conditions.
- The API stores Cognito `sub`, public wallet address, chain ID, and link time. It does not store email, OAuth tokens, signatures, passwords, private keys, or seed phrases.
- Only chain ID `12142816` is accepted. `rpc.winmarchain.io` is used read-only for EIP-1271 smart-contract-wallet verification.
- DynamoDB is on-demand billed with point-in-time recovery. Cognito email uses the default sender, which has service quotas; configure an approved SES sender separately if production email volume needs it.

## Build and review

From the repository root, create the Lambda bundle:

```bash
npm install --prefix infra/developer-auth/function --package-lock-only --ignore-scripts
bash scripts/build-developer-auth-lambda.sh
```

Then review `terraform.tfvars.example`, copy it to an untracked `terraform.tfvars`, replace the Cognito prefix and confirm the exact public origin. Initialize and validate Terraform with `-backend=false` before any plan. Use encrypted remote state, least-privilege AWS credentials, budget alarms, and an approved execution plan. Never commit `terraform.tfvars`, state files, credentials, or generated Lambda bundles.

After an approved deployment, copy the public outputs (`aws_region`, `user_pool_id`, `user_pool_client_id`, `hosted_ui_domain`, `redirect_uri`, and `wallet_api_url`) to the `developerAuth` object in `config/developer-tools.json`, set `enabled` true, and publish the static site. This final configuration must be a reviewed code change; do not write runtime outputs directly into `main`.

## Not included

This service does not provide token listing review, KYC, on-chain token update permissions, account recovery outside Cognito, administrator roles, or a promise that every token creator identity is endorsed by Winmar Chain.
