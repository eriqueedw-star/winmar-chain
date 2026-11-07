# WIP-004: Permissionless Market Deployment

- **Status:** Draft
- **Type:** Governance / Markets
- **Depends on:** WIP-001 and applicable market WIPs
- **Created:** 2026-10-25
- **Target:** Future mainnet capability; testnet registry scaffold implemented

## Summary

WIP-004 defines a rules-based mechanism by which third parties may propose markets using WMCore infrastructure without receiving unrestricted protocol privileges.

"Permissionless" means open proposal and standardized validation. It does not mean bypassing risk controls, oracle standards, collateral rules, legal restrictions, or protocol governance.

## Market Registry

WMCore clients MUST discover markets from the protocol market registry rather than shipping a fixed list of tradable symbols.

A registry record can include symbol and market kind, category, base and quote assets, token contract address when applicable, oracle source/feed, tick and lot size, maximum leverage, lifecycle status, and proposer identity.

The lifecycle is PROPOSED -> REVIEW -> TESTING -> ACTIVE, with PAUSED available when required. Only ACTIVE markets may accept orders.

## Proposed Flow

    Signed Market Proposal
            |
    Asset / Token Definition
            |
    Oracle + Price Validation
            |
    Risk Parameters
            |
    Liquidity / Market Maker Check
            |
    Governance / Safety Gate
            |
    Test Period
            |
    Registry Activation
            |
    API / SDK / Terminal Discovery

Activation in the registry means compatible wallets, terminals, market makers, and institutional clients can discover the market through the Winmar Chain API without a client release for every new symbol.

## Winmar-Issued Tokens

A token deployed on Winmar Chain MAY propose spot and/or perpetual markets. Deployment of a token alone MUST NOT automatically create a tradable market.

A token market SHOULD provide, as applicable, canonical token contract and metadata, supply and decimals, suitable oracle/index methodology for derivatives, quote/collateral definition, liquidity or market-maker plan, leverage/open-interest/risk parameters, and required bond, insurance, or reserve contribution.

## Deployer Requirements

A deployer MAY be required to:

- bond or stake WMC;
- provide approved oracle sources;
- define market metadata and settlement rules;
- comply with open-interest and leverage caps;
- fund or arrange market-making;
- contribute to insurance/risk reserves;
- maintain operational endpoints;
- accept slashing or market shutdown conditions for defined protocol violations.

## Market Isolation

Third-party markets SHOULD have configurable isolation boundaries so failure in one market does not automatically threaten unrelated markets or core collateral.

## Governance

The protocol SHOULD support emergency suspension for oracle failure, insolvency risk, exploit conditions, or material rule violations.

## Current Testnet Scaffold

The current WMCore testnet implementation includes dynamic market registry discovery, category/kind/status/query filters, signed market.propose actions, PROPOSED markets that cannot accept orders, activation gating before trading, and dynamic terminal discovery of ACTIVE markets.

Durable registry storage, governance authorization, deployer bonds, production oracle validation, and on-chain activation are not implemented yet and remain required before production use.
