# Winmar Document Verification API

## Purpose

API resmi untuk customer terdaftar yang ingin menerbitkan dan memverifikasi
dokumen berbasis SHA-256 di Winmar Chain. Customer tidak menerima private key
Winmar. API hanya menerima dokumen, menghitung hash sumber, meminta otorisasi
issuer, menunggu receipt on-chain, lalu menghasilkan PDF turunan dengan satu
halaman sertifikat A4 dan QR Explorer.

## Two issuance paths, one on-chain verification standard

**Public portal (no registration):** a user connects an EVM wallet, uploads a PDF, pays the 0.0021 WMC fee and waits for a distinct authorized on-chain registration before obtaining the official certificate. No account, login or API key is needed for this self-service path. **There is no off-chain certificate mode.**

**Registered organization (API):** only approved organizations obtain API credentials for embedding issuance within their website, portal or backend. An API key does not exempt documents from wallet payment, on-chain registration, hash matching, or official receipt verification. Enterprise integrations must securely bind a hosted wallet-payment intent or a proven existing payment transaction to the exact document ID, fee, chain and payer. Do not embed API secrets in a browser. Full policy: `docs/DOCUMENT_VERIFICATION_ACCESS_MODEL.md`.

## Customer onboarding (only for organization API access)

Customer wajib memiliki akun organisasi sebelum API access diterbitkan.

1. Customer mendaftar organisasi dan domain resmi.
2. Winmar melakukan verifikasi kontak, legal entity, dan administrator.
3. Customer mendaftarkan wallet issuer publik melalui proses approval.
4. Winmar menerbitkan API key dengan nama, environment, scope, dan rate limit.
5. Customer menyimpan API key sebagai secret server-side; key tidak boleh
   ditanam di browser, aplikasi mobile, atau PDF.

Status customer: `pending`, `active`, `suspended`, atau `revoked`.

## Environments

- `staging`: untuk integrasi dan test receipt; tidak boleh dipakai untuk
  dokumen produksi.
- `production`: Winmar Chain mainnet, chain ID `12142816`.

Base URL production: `https://api.winmarchain.io/v1`

Document Verification Treasury: `0x2d26e199f9be1A907239e403c4fad14C0856E7FD`

This wallet receives the application-level document issuance fee. It is
separate from the validator fee treasury and from the WUSD reserve wallet.

Initial application fee: `0.0021 WMC` (`2100000000000000` wei). The payment
contract accepts one payment per non-zero `documentId`, forwards the exact fee
to the Document Verification Treasury, and emits a `FeePaid` event. Network
gas remains a separate protocol fee.

## Authentication

Gunakan header berikut pada setiap request:

```http
Authorization: Bearer wmc_live_<secret>
Idempotency-Key: <uuid-v4>
```

API key ditampilkan sekali saat dibuat. Server menyimpan hanya hash key,
prefix, customer ID, scopes, status, expiry, dan waktu penggunaan terakhir.
Key dapat dirotasi atau dicabut tanpa mengubah dokumen yang sudah terbit.

Scope minimum:

- `documents:write` - membuat registrasi dokumen dan PDF sertifikat.
- `documents:read` - membaca status dokumen milik customer.
- `documents:revoke` - meminta pencabutan dokumen sesuai kebijakan issuer.

## Endpoints

### `POST /organizations`

Membuat permintaan registrasi organisasi. Endpoint ini tidak langsung memberi
akses produksi.

### `POST /api-keys`

Hanya administrator customer yang sudah `active` dan administrator Winmar
yang dapat menerbitkan key. Request harus memilih environment dan scopes.

### `POST /documents`

Menerima satu PDF sumber. Server wajib:

- menolak file selain PDF atau file melewati batas ukuran;
- memvalidasi dan memindai input sebelum diproses;
- menghitung SHA-256 dari byte PDF asli sebelum output dibuat;
- membuat `documentId` yang unik dan idempotent;
- mendaftarkan hash melalui wallet issuer yang disetujui;
- menunggu receipt dan confirmations;
- baru setelah sukses menghasilkan PDF turunan dengan satu halaman A4;
- membuat QR menuju `https://scan.winmarchain.io/verify/{documentId}`.

Response awal boleh `202 Accepted` dengan `jobId`. Client mengambil hasil dari
`GET /documents/{documentId}` atau `GET /jobs/{jobId}`.

Contoh response sukses:

```json
{
  "documentId": "0x...",
  "status": "active",
  "sha256": "...",
  "issuer": "0x...",
  "transactionHash": "0x...",
  "blockNumber": "...",
  "verificationUrl": "https://scan.winmarchain.io/verify/0x...",
  "downloadUrl": "https://api.winmarchain.io/v1/documents/0x.../pdf"
}
```

### `GET /documents/{documentId}`

Mengembalikan metadata publik, status, issuer, SHA-256, transaction hash,
block, timestamp, dan verification URL. Isi PDF tidak dikembalikan dari
endpoint metadata.

### `POST /documents/{documentId}/verify`

Client mengirimkan PDF untuk dihitung lokal di server API atau mengirim
`sha256` yang sudah dihitung. Response hanya `verified` jika hash cocok,
issuer valid, record aktif, dan receipt dapat dibaca dari chain.

### `POST /documents/{documentId}/revoke`

Memulai pencabutan hanya untuk issuer yang berwenang atau administrator sesuai
kebijakan. Pencabutan tidak menghapus record; Explorer menampilkan status
`REVOKED`.

## Security rules

- API tidak menyimpan private key customer maupun issuer di database.
- Wallet issuer berada di signer service terisolasi, dengan approval dan
  audit log.
- Source PDF dienkripsi saat transit dan saat disimpan sementara.
- Retention source dan derived PDF dikonfigurasi terpisah; default source
  dihapus setelah job selesai kecuali customer memilih retention.
- Rate limit diterapkan per customer, API key, dan IP.
- Semua mutation memakai `Idempotency-Key` untuk mencegah duplicate issuance.
- API key tidak boleh muncul di log, URL, response error, atau PDF.
- Metadata publik tidak boleh memuat isi dokumen atau data pribadi yang tidak
  diperlukan.
- `verified` tidak boleh diterbitkan sebelum receipt confirmed.
- QR adalah shortcut saja; Explorer membandingkan SHA-256, issuer, dan status
  on-chain sebagai sumber kebenaran.

## Suggested response codes

- `201 Created` - organization, API key, atau dokumen sudah dibuat.
- `202 Accepted` - job sedang menunggu signing atau confirmation.
- `400 Bad Request` - input tidak valid.
- `401 Unauthorized` - API key tidak ada atau salah.
- `403 Forbidden` - customer atau scope tidak berwenang.
- `409 Conflict` - idempotency conflict atau document ID sudah terdaftar.
- `413 Payload Too Large` - PDF melewati limit.
- `429 Too Many Requests` - rate limit.
- `500/503` - service atau chain belum tersedia; tidak boleh membuat klaim
  `VERIFIED ON-CHAIN`.

## Implementation gate

Sebelum production launch, wajib tersedia: database tenant dan API key hash,
approval workflow organisasi, signer isolation, upload scanning, retention
policy, contract tests, idempotency tests, revocation tests, audit log,
staging end-to-end test, dan Explorer verification route.
