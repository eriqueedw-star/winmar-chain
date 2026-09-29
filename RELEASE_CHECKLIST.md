# Release checklist

Use this checklist for public releases and subsequent signed release records.

## Source state

- [ ] Release commit is reviewed and identified by full Git SHA.
- [ ] Repository history has received a secret and privacy review.
- [ ] Production-only credentials and private operational data are absent.
- [ ] `config/network.json` matches the intended public network identity.
- [ ] Genesis material, if included, has been verified against production.

## Automated verification

- [ ] Repository-quality workflow passes.
- [ ] JSON files parse successfully.
- [ ] Markdown lint passes.
- [ ] Shell scripts pass syntax and ShellCheck validation.
- [ ] Publication privacy audit passes for tracked topology and binary-metadata checks.
- [ ] Logo metadata audit reports no `tEXt`, `zTXt`, `iTXt`, or `eXIf` chunks.
- [ ] Release-manifest smoke test passes.
- [ ] Secret scan reports no unresolved findings.
- [ ] Public-network probe passes on the release commit.
- [ ] Public-network evidence artifact is retained for the release review.

## Network and service evidence

- [ ] Chain ID resolves as `12142816` (`0xB948E0`).
- [ ] Public RPC and explorer are reachable and consistent with the active chain.
- [ ] Validator-set evidence has been captured through authorized RPC access.
- [ ] Bridge status and user-facing language match `docs/BRIDGE_TRUST_MODEL.md`.
- [ ] Chainlist status is recorded accurately at release time.

## Integrity and signing

- [ ] Generate SHA-256 checksums with `scripts/generate-release-manifest.sh`.
- [ ] Store the immutable checksum manifest under `checksums/`.
- [ ] Create a signed Git tag using an approved signing identity held outside the repository.
- [ ] Confirm the tag-triggered release-evidence workflow succeeds.
- [ ] Record the tag, commit SHA, checksum manifest, date, and release notes.

## Public repository review

- [ ] Complete `docs/PRIVACY_REVIEW.md`.
- [ ] Review `docs/PUBLICATION_FINDINGS.md` and record any accepted limitations.
- [ ] Historical personal-email metadata is reviewed as documented debt; future commits use a public or GitHub no-reply identity where possible, or an approved history rewrite is completed.
- [ ] Independent or second-party security review scope and limitations are documented.
- [ ] Open high-severity findings are resolved or explicitly block the release.

Follow `docs/RELEASE_PROCESS.md` for the signed-tag and evidence-bundle workflow.

Passing this checklist is a release-control record, not a substitute for an independent security audit.
