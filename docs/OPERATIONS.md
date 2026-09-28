# Operations runbook

## Validator health

Run `scripts/wmc-remote-health.sh` locally on a validator. Healthy output should show an active service, an advancing block height, sufficient peers, `false` for syncing after convergence, and the expected QBFT validator set.

## Change control

Before changing consensus, validator membership, genesis, bootnodes, DNS, firewall rules, RPC routing, or TLS:

1. capture the current configuration and health state;
2. identify affected nodes and quorum risk;
3. prepare a tested rollback;
4. perform the change on one non-critical target first when possible;
5. verify block production, finality, peers, explorer indexing, and public RPC;
6. record the outcome in `CHANGELOG.md`.

## Recovery material

`ops/static-nodes-recovery.json` contains public enode addresses used for recovery. Validate every address before deployment because IP addresses and topology may change.

