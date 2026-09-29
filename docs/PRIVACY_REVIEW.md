# Repository privacy and publication review

## Current publication state

The repository is public.

Phase 5 reconciles the repository documentation with that public state and converts the previous one-time publication checklist into an ongoing privacy review.

## Verified privacy evidence

- Full-history Gitleaks scanning is enforced in GitHub Actions.
- The former `ops/static-nodes-recovery.json` file is absent from the current public tree.
- The current root logo contains zero PNG text or EXIF metadata chunks among `tEXt`, `zTXt`, `iTXt`, and `eXIf`.
- The publication audit runs automatically in repository CI.
- Personal-email domains in Git history are reported without printing complete addresses.

Automated scanning reduces risk but does not prove that every form of sensitive or commercially restricted information has been removed.

## Known historical privacy debt

The pre-Phase-5 public `main` history measured four `gmail.com` occurrences in commit author or committer metadata.

Phase 5 maintenance also demonstrated that the current GitHub connector commit identity can add personal-email metadata. Because that identity is used to perform repository updates, a hard count-based CI gate would block legitimate remediation work while continuing to create the same metadata.

The current control is therefore informational:

- the audit reports personal-email domains and occurrence counts;
- complete email addresses are not printed;
- repository maintainers should configure a public or GitHub no-reply commit identity before claiming remediation;
- full canonical-history cleanup requires an approved history rewrite.

A rewrite cannot guarantee removal from external clones, forks, caches, or previously fetched Git objects.

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
- public operational topology is present without an explicit publication decision;
- a binary asset contains unreviewed sensitive metadata;
- bridge documentation overstates the implemented security or trust model;
- a high-severity review finding remains open.

Personal-email commit metadata is a documented privacy finding that should be reviewed and remediated separately from secret-scanning controls.

## Release record

For a signed release, record the source commit, tag, checksum manifest, review date, known limitations, Chainlist status, and any intentionally published infrastructure records.
