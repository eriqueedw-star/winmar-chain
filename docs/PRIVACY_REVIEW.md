# Repository privacy and publication review

## Current publication state

The repository remains private. A visibility change must be a separate approved action and must not be coupled automatically to documentation or CI changes.

## Review evidence

The repository workflow performs a full-history Gitleaks scan on pull requests and pushes. Phase 1 and Phase 2 were merged only after the secret scan and repository-quality checks passed.

A successful automated secret scan reduces risk but does not prove that all private, commercially sensitive, personal, or operationally sensitive information has been removed.

## Second-review checklist

Before any public visibility change, complete a second human review of:

- every tracked file in the release commit;
- Git history for accidentally committed sensitive material;
- public IP addresses and enode records to confirm that publication is intentional;
- names, email addresses, personal metadata, and internal identifiers;
- operational topology and recovery material;
- screenshots, binary assets, archives, and generated reports;
- references to infrastructure providers, internal hostnames, and administrative interfaces;
- license, copyright, and brand-provenance records.

## Blocking conditions

Do not make the repository public when any of the following is unresolved:

- a secret, credential, signing key, recovery code, or privileged endpoint is present;
- production genesis or QBFT values are unverified;
- public-node topology exposes information that operations has not approved for publication;
- a binary or archive has not been reviewed for embedded metadata;
- bridge documentation overstates the implemented security or trust model;
- a high-severity review finding remains open.

## Publication record

When a public release is approved, record the source commit, release tag, checksum manifest, reviewers, review date, known limitations, and any intentionally retained public infrastructure records.
