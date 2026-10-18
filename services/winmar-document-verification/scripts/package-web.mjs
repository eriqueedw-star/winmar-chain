import { createHash } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'web');
const destination = join(root, 'dist', 'document-verification');
const files = [
  'index.html',
  'certificate.html',
  'styles.css',
  'app.bundle.js',
  'winmar-chain-logo-framed-v2.png',
  'winmar-verification-certificate-public.png',
];

await mkdir(destination, { recursive: true });
const checksums = {};
for (const name of files) {
  const bytes = await readFile(join(source, name));
  await copyFile(join(source, name), join(destination, name));
  checksums[name] = createHash('sha256').update(bytes).digest('hex');
}
await writeFile(join(destination, 'manifest.json'), JSON.stringify({
  route: '/document-verification/',
  chainId: 12142816,
  files: checksums,
}, null, 2) + '\n');
console.log(`Release ready: ${destination} (${files.length} files + manifest)`);
