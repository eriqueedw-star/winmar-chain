# Release checksum manifests

This directory is reserved for immutable checksum manifests associated with signed releases.

Recommended naming:

```text
SHA256SUMS-vX.Y.Z.txt
```

Each manifest should be generated from the exact published artifacts and committed with the release preparation change. Signing keys, private certificates, hardware-token secrets, and recovery codes must remain outside the repository.

The accompanying release notes should identify the release tag and full source commit SHA.
