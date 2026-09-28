# Validator membership and change procedure

## Security boundary

Validator private keys, keystores, passwords, signing material, seed phrases, and privileged SSH credentials must never be committed to this repository.

## Change classes

Validator membership changes include adding a validator, removing a validator, replacing validator infrastructure, or recovering a validator identity onto approved infrastructure.

## Pre-change requirements

Before any membership vote:

1. capture current block height, peer count, sync state, and validator set;
2. confirm the candidate validator address through an independently verified channel;
3. evaluate quorum impact if a validator becomes unavailable during the change;
4. prepare rollback and incident contacts;
5. confirm all participating validators are healthy enough to complete voting;
6. record the intended change and reviewer approval outside the production keys.

QBFT safety depends on maintaining sufficient honest and available validators. Do not execute simultaneous membership or infrastructure changes that could put finality at risk.

## Besu voting workflow

Use authorized local or private administrative RPC access only.

Typical evidence calls include:

```text
qbft_getValidatorsByBlockNumber
qbft_getPendingVotes
qbft_proposeValidatorVote
qbft_discardValidatorVote
```

Exact parameters and the target validator address must be taken from the approved change record. Do not paste private RPC credentials into tickets, chat, or Git.

## Post-change verification

After the vote is finalized:

- confirm the expected validator set from more than one trusted node;
- verify block production and finality continue;
- verify peer connectivity and explorer indexing;
- confirm the public RPC remains responsive;
- clear stale votes where appropriate;
- record the resulting validator set hash or evidence reference in the internal change record;
- update `CHANGELOG.md` when the change is operationally significant.

## Emergency removal

If a validator is suspected of key compromise, isolate the affected host, rotate or revoke dependent credentials, assess whether the validator address must be removed, and preserve forensic evidence without committing sensitive material to this repository.
