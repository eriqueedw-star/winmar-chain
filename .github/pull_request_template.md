# Pull request

## Summary

Describe the change, affected components, and intended outcome.

## Security and operations checklist

- [ ] No private keys, mnemonics, keystores, passwords, tokens, cloud credentials, or unrestricted administrative endpoints are included.
- [ ] Public network identity changes, if any, are reflected in `config/network.json`.
- [ ] Consensus, validator, bootnode, DNS, RPC, firewall, or bridge changes include peer review and a rollback plan.
- [ ] Production genesis or QBFT parameters are verified against the active network rather than inferred.
- [ ] User-facing bridge claims match `docs/BRIDGE_TRUST_MODEL.md`.
- [ ] `CHANGELOG.md` is updated for material operational or public changes.
- [ ] Repository quality and secret-scanning checks pass.

## Evidence

Link or summarize the non-sensitive verification evidence used for this change.

## Rollback

Describe the rollback or recovery path for operationally significant changes.
