# Winmar Chain — Cognito & Developer Auth Handoff

Lanjutkan pekerjaan autentikasi developer Winmar Chain menggunakan AWS Cognito dan backend wallet-link. Gunakan kontrol browser pada tab AWS CloudShell yang sudah login ke akun AWS `362095365737`, region `eu-north-1` (Stockholm).

## Status saat ini

- Cognito User Pool sudah dibuat: `Winmar Developer Accounts`
- User Pool ID: `eu-north-1_ph3o7VEeZ`
- App client: `Winmar Developer Tools`
- Public Client ID: `jshhsqetnl2k2kn11me8o4r4v`
- Managed login origin: `https://eu-north-1ph3o7veez.auth.eu-north-1.amazoncognito.com`
- Callback dan logout URL: `https://winmarchain.io/developers.html`
- OAuth flow: authorization code dengan PKCE
- OAuth scopes: `openid email`
- Email sign-up, email verification, dan password recovery sudah aktif.
- MFA opsional menggunakan authenticator/TOTP.
- Deletion protection aktif.
- Email verifikasi sudah memakai teks Winmar.
- Signup dan callback Cognito sudah berhasil diuji dengan akun nyata.
- Password minimum saat ini 12 karakter. Pemilik meminta diturunkan menjadi **8 karakter**, dengan huruf besar, huruf kecil, angka, dan simbol tetap diwajibkan. Pemilik sudah mengonfirmasi perubahan keamanan ini.

## Repository

- Repo: `https://github.com/eriqueedw-star/winmar-chain.git`
- Branch: `codex/developer-email-auth`
- Draft PR: `https://github.com/eriqueedw-star/winmar-chain/pull/29`
- Commit terbaru: `bc0ae61`
- Terraform berada di `infra/developer-auth`.
- Terraform sudah diubah agar memakai Cognito pool yang ada dan tidak membuat pool kedua.
- `config/developer-tools.json` masih memiliki `developerAuth.enabled: false` dan `apiUrl: null`. Jangan aktifkan sampai backend berhasil dideploy dan diuji.

## Tugas yang harus diselesaikan

1. Di AWS Console, ubah minimum password Cognito dari 12 menjadi 8 karakter; pertahankan persyaratan huruf besar, huruf kecil, angka, dan simbol.
2. Di AWS CloudShell, clone branch dan bangun Lambda bundle:

```bash
git clone -b codex/developer-email-auth https://github.com/eriqueedw-star/winmar-chain.git
cd winmar-chain
npm install --prefix infra/developer-auth/function --package-lock-only --ignore-scripts
bash scripts/build-developer-auth-lambda.sh
cd infra/developer-auth
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform validate
terraform plan -out=tfplan
```

3. Tinjau plan sebelum apply. Plan seharusnya membuat backend wallet-link saja: DynamoDB, IAM, Lambda, API Gateway, dan resource pendukung. Plan tidak boleh membuat Cognito User Pool, app client, atau domain Cognito kedua.
4. Pemilik sudah mengizinkan deployment resource backend AWS dan memahami bahwa resource AWS dapat menimbulkan biaya. Jika plan sesuai, jalankan:

```bash
terraform apply tfplan
terraform output
```

5. Ambil output `wallet_api_url`. Perbarui `config/developer-tools.json`:

```json
{
  "developerAuth": {
    "enabled": true,
    "provider": "amazon-cognito",
    "region": "eu-north-1",
    "userPoolId": "eu-north-1_ph3o7VEeZ",
    "clientId": "jshhsqetnl2k2kn11me8o4r4v",
    "hostedUiDomain": "https://eu-north-1ph3o7veez.auth.eu-north-1.amazoncognito.com",
    "redirectUri": "https://winmarchain.io/developers.html",
    "apiUrl": "<wallet_api_url dari Terraform>",
    "chainId": 12142816
  }
}
```

6. Commit dan push perubahan ke branch `codex/developer-email-auth`.
7. Setelah situs diperbarui, uji end-to-end:
   - sign in dengan email Cognito;
   - callback kembali ke `developers.html`;
   - authorization code ditukar menjadi token;
   - sesi developer tampil;
   - wallet creator terhubung dan menandatangani pesan non-transaksi;
   - wallet berhasil ditautkan melalui API;
   - logout berhasil.

## Batas keamanan

- Jangan meminta atau menyimpan seed phrase/private key.
- Jangan menempelkan password, OTP, authorization code, token, atau kredensial AWS ke chat atau repo.
- App client Cognito harus tetap public tanpa client secret.
- Tanda tangan wallet hanya untuk asosiasi identitas, bukan transaksi.
- Jangan aktifkan frontend sebelum API tersedia dan pengujian end-to-end berhasil.
- Jangan membuat Cognito pool kedua.

## Prompt untuk chat baru

> Baca file `COGNITO_DEPLOY_HANDOFF.md` di workspace WINMARCHAIN. Gunakan `@Browser` untuk mengontrol AWS CloudShell yang sudah login. Selesaikan perubahan password Cognito menjadi minimum 8 karakter, jalankan Terraform plan, pastikan tidak membuat Cognito kedua, lalu apply backend wallet-link sesuai handoff. Setelah deploy, perbarui konfigurasi developer auth, commit/push ke branch, dan lakukan uji end-to-end. Jangan pernah meminta password, OTP, private key, seed phrase, atau token lewat chat.
