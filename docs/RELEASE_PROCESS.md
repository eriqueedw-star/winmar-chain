# Release process

## Purpose

This runbook defines how Winmar Chain repository releases should be prepared, evidenced, signed, and published without placing signing material or production secrets in GitHub.

## Preconditions

Before creating a release tag:

- the target commit has passed repository-quality, secret-scanning, and public-network workflows;
- all items in `docs/PUBLICATION_FINDINGS.md` are resolved or explicitly accepted;
- `docs/PRIVACY_REVIEW.md` is completed for any public visibility change;
- Chainlist PR status is recorded according to the current upstream state;
- bridge language matches the implemented and reviewed trust model;
- production genesis or QBFT parameters are included only if independently verified against the active validator fleet.

## Release candidate

1. Review the complete diff from the prior release.
2. Confirm `config/network.json` matches the intended public identity.
3. Confirm the external public-network probe succeeds.
4. Run or review the release-manifest smoke test.
5. Capture any authorized validator-set evidence outside public logs when it contains operationally sensitive context.

## Signed tag

Create the signed annotated tag from an approved workstation or signing environment. Do not place private signing keys, recovery codes, or hardware-token credentials in GitHub.

Example:

```bash
git checkout <approved-release-commit>
git tag -s vX.Y.Z -m "Winmar Chain vX.Y.Z"
git push origin vX.Y.Z
```

The pushed `v*` tag triggers `.github/workflows/release-evidence.yml`.

## Evidence bundle

The release-evidence workflow generates:

- a SHA-256 manifest for tracked repository files;
- a copy of canonical `config/network.json`;
- the current audit-status record;
- the current publication-findings record;
- release metadata containing version, source commit, source ref, and generation time.

The GitHub Actions artifact is retained as workflow evidence. For long-term public releases, attach the checksum manifest to the corresponding GitHub Release and/or commit the approved manifest under `checksums/` as part of the release record.

## Publication

Creating or signing a tag does not authorize a repository visibility change. Public visibility requires a separate documented decision after the privacy and publication gates are satisfied.

## Post-release verification

After release:

1. verify the release tag resolves to the approved commit;
2. verify the checksum manifest against the published artifacts;
3. verify public RPC chain ID and block progression;
4. verify website and explorer reachability;
5. record Chainlist status and any cache-propagation observations;
6. record incidents or rollback actions in `CHANGELOG.md`.
