# Security policy

## Never commit

- validator or wallet private keys;
- seed phrases or mnemonics;
- keystore files or passwords;
- SSH private keys;
- cloud credentials, API tokens, or session cookies;
- production `.env` files;
- personal recovery information;
- unrestricted administrative RPC endpoints.

If a secret is committed, treat it as compromised: revoke or rotate it immediately, remove it from current files and Git history, and document the incident without reproducing the secret.

## Reporting

Until a dedicated security mailbox is published, do not disclose exploitable details in a public GitHub issue. Contact the project owner privately and provide a minimal reproduction, affected component, impact, and recommended remediation.

## Operational baseline

- Keep JSON-RPC administration methods private.
- Restrict validator SSH and P2P exposure using host and cloud firewalls.
- Prefer key-based SSH, disable password authentication, and limit root login.
- Back up genesis, node keys, permissioning configuration, and validator membership records separately and securely.
- Monitor block production, peer count, disk usage, clock synchronization, and certificate expiry.

