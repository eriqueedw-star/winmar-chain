import { mkdir, readFile, open, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fail } from './core.mjs';

/*
 * Reference single-deployment durable store. Source PDFs and API secrets
 * are NEVER written here. Not safe for multi-instance scaling. Replace
 * with a transactional database before production deployment.
 */
const sha = value => createHash('sha256').update(value).digest('hex');

function validIntentId(id) {
  if (typeof id !== 'string' || !/^int_[0-9a-f]{64}$/.test(id)) {
    throw fail('Intent not found', 404);
  }
  return id;
}

export class IntentStore {
  constructor(root) {
    if (typeof root !== 'string' || !path.isAbsolute(root)) {
      throw new Error('Absolute private storage path required');
    }
    this.root = root;
  }

  async directory(tenantId) {
    const folder = path.join(this.root, sha(tenantId));
    await mkdir(folder, { recursive: true, mode: 0o700 });
    return folder;
  }

  async create(tenantId, idemKey, { documentId, payerWallet }) {
    if (typeof idemKey !== 'string' || !/^[A-Za-z0-9_-]{12,128}$/.test(idemKey)) {
      throw fail('Idempotency-Key must be 12 to 128 URL-safe characters');
    }
    const id = 'int_' + sha(tenantId + '\0' + idemKey);
    const file = path.join(await this.directory(tenantId), id + '.json');
    const record = {
      id, tenantId, documentId, payerWallet,
      paymentTxHash: null, registrationTxHash: null,
      createdAtUtc: new Date().toISOString(),
    };

    try {
      const fd = await open(file, 'wx', 0o600);
      try { await fd.writeFile(JSON.stringify(record) + '\n', 'utf8'); }
      finally { await fd.close(); }
      return { record, created: true };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
    const existing = await this.get(tenantId, id);
    if (existing.documentId !== documentId || existing.payerWallet !== payerWallet) {
      throw fail('Idempotency-Key already used for a different document or wallet', 409);
    }
    return { record: existing, created: false };
  }

  async get(tenantId, id) {
    const validId = validIntentId(id);
    const filename = path.join(await this.directory(tenantId), validId + '.json');
    let result;
    try { result = JSON.parse(await readFile(filename, 'utf8')); }
    catch (error) {
      if (error.code === 'ENOENT') throw fail('Intent not found for this organization', 404);
      throw error;
    }
    if (result.tenantId !== tenantId || result.id !== validId) {
      throw fail('Invalid stored intent or tenant mismatch', 503);
    }
    return result;
  }

  async attachValidatedProof(tenantId, id, { paymentTxHash, registrationTxHash = null }) {
    const validId = validIntentId(id);
    const file = path.join(await this.directory(tenantId), validId + '.json');
    const lock = file + '.lock';
    let fd;
    try { fd = await open(lock, 'wx', 0o600); }
    catch (error) {
      if (error.code === 'EEXIST') throw fail('Intent currently being updated; retry', 409);
      throw error;
    }

    try {
      const existing = await this.get(tenantId, validId);
      if (existing.paymentTxHash && existing.paymentTxHash !== paymentTxHash) {
        throw fail('Intent bound to a different payment transaction', 409);
      }
      if (registrationTxHash && existing.registrationTxHash &&
          existing.registrationTxHash !== registrationTxHash) {
        throw fail('Intent bound to a different registration transaction', 409);
      }
      const updated = {
        ...existing,
        paymentTxHash,
        registrationTxHash: registrationTxHash || existing.registrationTxHash,
      };
      const temporary = file + '.tmp';
      const temp = await open(temporary, 'wx', 0o600);
      try { await temp.writeFile(JSON.stringify(updated) + '\n', 'utf8'); }
      finally { await temp.close(); }
      await rename(temporary, file);
      return updated;
    } finally {
      await fd.close();
      await unlink(lock).catch(() => {});
    }
  }
}
