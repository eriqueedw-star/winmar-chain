# CSP Report-Only evidence — 2026-10-17

## Scope

This is a production observation record for the public website, explorer, and
Bridge. CSP remains `Content-Security-Policy-Report-Only`; this record does not
authorize enforcement.

## Verified endpoints

| Surface | URL | Result |
| --- | --- | --- |
| Website | `https://winmarchain.io/` | HTTP 200; CSP Report-Only present |
| Explorer | `https://scan.winmarchain.io/` | HTTP 200; CSP Report-Only present |
| Bridge | `https://bridge.winmarchain.io/` | HTTP 200; CSP Report-Only present |

All three surfaces also returned HSTS, `X-Frame-Options: SAMEORIGIN`,
`X-Content-Type-Options: nosniff`, and an explicit `Referrer-Policy`. TLS
verification succeeded with TLS 1.3 and a valid Let's Encrypt certificate.

## Browser observations

The developer, explorer, and Bridge pages were loaded after deployment. No
console `error` or `warning` entries were observed during the check. This is
evidence from those loads only, not proof that every route, browser, or user
flow is violation-free.

## Review notes

- The website and Bridge policies are relatively narrow and should be tested
  across every linked route before enforcement.
- The explorer has additional third-party and websocket dependencies and needs
  route-level coverage before it can be considered for enforcement.
- The missing Bridge asset references were removed before CSP enforcement was
  considered, so they cannot continue generating browser resource failures.

## Staged enforcement gate

Do not switch to enforcing CSP yet. First retain Report-Only long enough to
collect violation reports across normal traffic, classify each source as
required or unexpected, and verify all public routes. If the evidence remains
clean, enforce one surface at a time, beginning with the narrowest policy, and
keep an immediate rollback to Report-Only.
