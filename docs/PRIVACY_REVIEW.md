# Repository privacy and publication review

## Current publication state

The repository is public.

Phase 5 reconciles the repository documentation with that public state and converts the previous one-time publication checklist into an ongoing privacy and no-regression control.

## Verified privacy evidence

- Full-history Gitleaks scanning is enforced in GitHub Actions.
- The former `ops/static-nodes-recovery.json` file is absent from the current public tree.
- The current root logo contains zero PNG text or EXIF metadata chunks among `tEXt`, `zTXt`, `iTXt`, and `eXIf`.
- The publication audit runs automatically in repository CI.
- No new common personal-email-domain occurrences are permitted above the recorded historical baseline.

Automated scanning reduces risk but does not prove that every form of sensitive or commercially restricted information has been removed.

## Known historical privacy debt

The public Git history currently includes four `gmail.com` occurrences in commit author or committer metadata.

This historical count is recorded in `config/publication-audit-baseline.json`. CI fails if the count increases.

A future approved history rewrite may reduce or remove these occurrences, but a rewrite cannot guarantee removal from external clones, forks, caches, or previously fetched Git objects.

## Ongoing review checklist

For material public releases and major repository changes, review:

- every tracked file in the release commit;
- Git history for newly introduced sensitive material;
- personal metadata and commit identity configuration;
- operational topology, recovery material, and administrative endpoints;
- screenshots, binary assets, archives, and generated reports;
- infrastructure-provider references and internal hostnames;
- license, copyright, and brand-provenance records;
- bridge and validator documentation for claims that exceed verified evidence.

## Blocking conditions for future releases

Block a release when any of the following is unresolved:

- a secret, credential, signing key, recovery code, or privileged endpoint is present;
- the publication audit reports a new personal-email occurrence above baseline;
- public operational topology is present without an explicit publication decision;
- a binary asset contains unreviewed sensitive metadata;
- bridge documentation overstates the implemented security or trust model;
- a high-severity review finding remains open.

## Release record

For a signed release, record the source commit, tag, checksum manifest, review date, known limitations, Chainlist status, and any intentionally published infrastructure records.
