# Release checklist

Use this checklist for the first public baseline and subsequent signed releases.

## Source state

- [ ] Release commit is reviewed and identified by full Git SHA.
- [ ] Repository history has received a second secret and privacy review.
- [ ] Production-only credentials and private operational data are absent.
- [ ] `config/network.json` matches the intended public network identity.
- [ ] Genesis material, if included, has been verified against production.

## Automated verification

- [ ] Repository-quality workflow passes.
- [ ] JSON files parse successfully.
- [ ] Markdown lint passes.
- [ ] Shell scripts pass syntax and ShellCheck validation.
- [ ] Secret scan reports no unresolved findings.

## Network and service evidence

- [ ] Chain ID resolves as `12142816` (`0xB948E0`).
- [ ] Public RPC and explorer are reachable and consistent with the active chain.
- [ ] Validator-set evidence has been captured through authorized RPC access.
- [ ] Bridge status and user-facing language match `docs/BRIDGE_TRUST_MODEL.md`.
- [ ] Chainlist status is recorded accurately at release time.

## Integrity and signing

- [ ] Generate SHA-256 checksums for release artifacts.
- [ ] Store the immutable checksum manifest under `checksums/`.
- [ ] Create a signed Git tag using an approved signing identity held outside the repository.
- [ ] Record the tag, commit SHA, checksum manifest, date, and release notes.

## Publication decision

- [ ] Independent or second-party security review scope and limitations are documented.
- [ ] Open high-severity findings are resolved or explicitly block publication.
- [ ] Repository visibility change is separately approved.

Passing this checklist is a release-control record, not a substitute for an independent security audit.
