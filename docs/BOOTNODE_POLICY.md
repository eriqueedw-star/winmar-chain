# Bootnode and peer-discovery policy

## Purpose

This policy separates validator membership from peer discovery. A node being reachable as a bootnode or static peer does not make it a validator, and a validator does not need to be published as a bootnode.

## Current repository state

`ops/static-nodes-recovery.json` is retained as recovery material containing public enode addresses. It must not automatically be treated as the canonical bootnode list until each entry is revalidated against the live topology.

## Publication requirements

A public bootnode entry may be committed only when:

- its enode public key is intentionally public;
- its host and P2P port are intended for Internet reachability;
- the node exposes no administrative JSON-RPC service through the same public interface;
- firewall rules limit exposure to the minimum required services;
- ownership and operational responsibility are documented internally;
- removal and rotation can be performed without affecting validator-key custody.

## Rotation

For any bootnode or static-peer replacement:

1. validate the replacement node and P2P reachability;
2. add it to a non-critical node first;
3. confirm peer discovery and block synchronization;
4. deploy the change gradually;
5. remove the retired entry only after replacement coverage is confirmed;
6. update recovery material and `CHANGELOG.md`.

## Monitoring

Track reachability, peer count, certificate expiry where applicable, disk pressure, clock synchronization, and unexpected port exposure. A public bootnode outage should degrade discovery capacity, not compromise consensus keys.
