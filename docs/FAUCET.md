# Winmar Faucet

## Mainnet V2 design

`WinmarFaucetV2` is a separate deployment so the existing faucet address and
behavior remain unchanged. It enforces one successful claim per recipient for
the lifetime of that deployment, including claims submitted through the
relayer. This is an address-level limit, not a proof of one claim per human;
users can create additional addresses. A fresh deployment starts paused. The intended initial settings are
`0.00001 WMC` per claim and a `10 WMC` UTC-day distribution cap. The cap allows
at most 1,000,000 distinct successful claims in one UTC day at that claim size.

`0.00001 WMC` is enough to cover one payout; `1 WMC` covers at most 100,000
payouts at the intended claim size and is a more conservative initial treasury
deposit than the full daily cap. Relayer gas is a separate operating budget.

Do not publish or fund a new faucet address until the deployment receipt,
runtime bytecode, admin, parameters, paused state, and explorer record have
been checked. The website configuration must be updated to the verified V2
address after deployment; do not leave the old faucet address presented as the
current funding target.

## Purpose

The Winmar Faucet distributes native WMC from a funded faucet treasury to developers.

The faucet contract does not mint WMC. It only transfers the native currency already deposited into the faucet.

## Safety controls

- per-recipient wallet cooldown (also enforced on relayed claims);
- optional admin-appointed gas sponsor relayer (`setRelayer`, disabled by default);
- `claimFor(recipient)` restricted to a single approved relayer;
- non-reentrant claim guard;
- global daily distribution cap;
- pause control;
- explicit admin withdrawal;
- no validator private key;
- no wallet seed phrase;
- no unrestricted RPC administration.

The web UI should additionally use:

- CAPTCHA or equivalent bot protection;
- IP/request rate limiting;
- wallet abuse detection;
- optional minimum wallet-age or activity rules;
- monitoring and alerting for treasury depletion.

These off-chain controls are intentionally not embedded in the contract. **Do not appoint a relayer or fund the faucet until those protections are deployed.** A compromised relayer could dispense the funded treasury up to the daily cap across many wallets.

## Zero-WMC wallet onboarding (gas-sponsored)

Users with no native WMC cannot submit a regular `claim()` transaction without paying gas. The contract therefore supports `claimFor(recipient)`, authorized exclusively to an admin-appointed relayer wallet.

Required off-chain request flow before public launch:

1. User requests WMC from the official frontend; the backend authenticates wallet ownership with a fresh, domain-bound nonce and a signature. Never request private keys.
2. Service checks CAPTCHA, IP/device request quotas, wallet/address risk flags, and per-day spend controls.
3. A dedicated non-validator relayer pays gas and calls `claimFor(recipient)` for approved recipients.
4. The on-chain contract enforces recipient cooldown, treasury balance, pause and global daily cap even if service controls fail.
5. Record request ID, transaction receipt and observable alerts. Never expose the relayer key in frontend code or public GitHub.

**Development status:** Only the on-chain relayer entrypoint is implemented. The authenticated backend, wallet-signature nonce verifier, CAPTCHA, abuse monitoring and relayer deployment are **NOT implemented or enabled**. This does not make a production faucet ready.

## Deployment policy

**Controlled mainnet deployment.**

The current deployment workflow targets Winmar Chain mainnet through the protected `production` environment. The faucet must use a dedicated operational funding wallet or treasury allocation; do not use a validator signing key.

Before deployment:

1. compile with the pinned Solidity compiler;
2. review constructor parameters;
3. deploy from a dedicated faucet-admin account;
4. fund the contract with a bounded WMC amount;
5. verify the contract source;
6. record the deployed address and transaction hash;
7. configure the web UI;
8. test claim, relayer authorization, cooldown, cap, pause, and withdrawal behavior;
9. only after external anti-abuse infrastructure is ready, configure a separate limited relayer wallet using `setRelayer`.

## Initial controlled configuration

The legacy V1 examples below do not apply to V2:

- claim amount: 0.1 WMC;
- cooldown: 24 hours;
- daily cap: 100 WMC.

The actual values must be approved by the mainnet operator before funding.

## User flow

Connect Wallet -> Verify network -> Sign backend challenge (without gas) -> Anti-bot checks -> Relayer-sponsored claim -> Explorer receipt

The UI must never request a user's private key or seed phrase.
