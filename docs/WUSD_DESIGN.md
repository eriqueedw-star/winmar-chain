# WMUSD design baseline

WMUSD is Winmar's reserve-backed settlement token for approved applications.
It is not official Tether USDT and must not use Tether branding or imply a
claim on Tether reserves.

## Initial parameters

- Name: `Winmar USD Stablecoin`
- Symbol: `WMUSD`
- Decimals: `6`
- Chain: Winmar Chain mainnet, chain ID `12142816`
- Intended document fee: `2 WUSD` plus WMC network gas

The initial application-fee treasury is:

`0x2d26e199f9be1A907239e403c4fad14C0856E7FD`

This is separate from the WUSD reserve custodian wallet and the validator fee
treasury. The initial WMC payment phase may route `0.0021 WMC` to this wallet;
switching to WUSD requires a payment-contract configuration change and audit.

## Authority model

Designated legal custodian: **Winmar Holdings**. Winmar Holdings is responsible
for reserve custody, reserve evidence, redemption operations, and appointing
the approved multisig signers. This designation must be backed by the relevant
corporate and regulatory documentation before WUSD is offered publicly.

- `DEFAULT_ADMIN_ROLE`: multisig/timelock only.
- `MINTER_ROLE`: reserve custodian or isolated mint service.
- `BURNER_ROLE`: redemption service or bridge controller.
- `PAUSER_ROLE`: emergency response multisig.

There is no public mint function. Every mint requires a unique non-zero
reserve reference and is recorded in an event. The mint cap is optional but
should be non-zero in production. The contract cannot prove off-chain reserves;
reserve reconciliation and custodian controls are mandatory.

## Required pre-production gates

1. Create and test a 2-of-3 or 3-of-5 reserve multisig.
2. Define reserve custody, redemption, and reconciliation policy.
3. Test mint, duplicate reserve reference, burn, pause, cap, and role revocation.
4. Add a payment contract that accepts exactly `2 WUSD` for document issuance.
5. Audit WUSD and payment contracts before deployment.
6. Deploy to staging first and verify explorer events.
7. Deploy production only after multisig approval and a recorded reserve snapshot.
