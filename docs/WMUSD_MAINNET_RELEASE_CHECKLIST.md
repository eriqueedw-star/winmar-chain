# WMUSD Mainnet Release Checklist

This checklist is for a dormant, pre-issuance deployment only. It does not authorize public minting, sale, or redemption.

## Network preflight

- [ ] RPC is `https://rpc.winmarchain.io/`.
- [ ] Chain ID is `12142816` (`0xB948E0`).
- [ ] Explorer is reachable and supports source verification.
- [ ] Deployment wallet is controlled by the Winmar team and funded for gas.
- [ ] No private key, seed phrase, password, or OTP is stored in Git or sent in chat.

## Artifact lock

- [ ] Final `WMUSD.json` ABI and bytecode are reviewed.
- [ ] Contract source and compiler settings are recorded.
- [ ] Artifact SHA-256 is recorded before deployment.
- [ ] Constructor roles are reviewed.
- [ ] Admin migration plan to 2-of-3 multisig is documented.

## Dormant constructor state

- [ ] `initialMintCap = 0`.
- [ ] `mintingEnabled = false`.
- [ ] `redemptionEnabled = false`.
- [ ] Public sale and swap are not connected.
- [ ] No reserve is represented as circulating backing at deployment time.

## After deployment

- [ ] Record contract address, deployment transaction, block number, chain ID, and artifact hash.
- [ ] Verify source code on the explorer.
- [ ] Read back name, symbol, decimals, total supply, cap, and gate states.
- [ ] Confirm role addresses and admin authority.
- [ ] Create the attestor submission package using the recorded values.
- [ ] Transfer admin authority to the approved multisig before any activation.

## Explicit prohibition

Do not enable minting, set a non-zero cap, enable redemption, open public sale, or describe WMUSD as circulating until contract audit, reserve verification, attestation, legal review, and multisig migration are complete.
