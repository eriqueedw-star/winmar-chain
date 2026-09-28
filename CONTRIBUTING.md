# Contributing

1. Work from a focused branch and use clear commit messages.
2. Do not include secrets or personal account data.
3. Update `CHANGELOG.md` for user-visible or operational changes.
4. Update `config/network.json` when a canonical public endpoint changes.
5. Add evidence to `docs/AUDIT_STATUS.md` when a check or external audit is completed.
6. Verify JSON files parse and shell scripts pass `shellcheck` when available.

Changes to genesis, validator membership, consensus settings, DNS, RPC routing, or production firewall rules require peer review and a rollback plan.

