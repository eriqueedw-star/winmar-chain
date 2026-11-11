# Security headers production change checklist

- [ ] Identify hosting/CDN/proxy owner for bridge.winmarchain.io
- [ ] Identify hosting/CDN/proxy owner for winmarchain.io
- [ ] Identify hosting/CDN/proxy owner for scan.winmarchain.io
- [ ] Export current HTTP headers and final redirect URLs
- [ ] Inventory browser scripts, external RPC endpoints, websocket and WalletConnect dependencies
- [ ] Deploy host-specific CSP in Report-Only mode
- [ ] Review violations and test wallet flows on desktop and mobile
- [ ] Deploy approved frame protection on website
- [ ] Stage HSTS max-age, then increase only after verification
- [ ] Enforce CSP after report-only validation
- [ ] Re-run bridge-readiness-evidence workflow and archive ZIP
- [ ] Complete testnet bridge regression tests; record failures and rollback plan
