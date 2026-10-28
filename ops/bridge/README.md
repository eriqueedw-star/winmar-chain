# Bridge production asset ownership

The production Bridge page is currently served as a static document from
`/var/www/winmar-bridge/index.html` on the Winmar production host. It is not
part of the application source tree in this repository.

## 2026-10-16 repair

The page referenced two files that were not deployed:

- `/brand/winmar-explorer.css?v=7`
- `/brand/winmar-brand.js?v=10`

The page already contains its required styles inline and does not depend on
the missing script. The production repair removed only those stale references;
it did not add placeholder assets or change Bridge behavior. A root-owned
backup was created under `/var/backups/winmar-bridge-20261016T172748Z` before
the edit. `nginx -t` passed after the edit and the public page returned HTTP
200 without either stale reference.

Any future Bridge UI change should first be added to a tracked source tree and
deployed as an immutable release. Do not edit the live document without a
matching source commit and a backup.
