import { mkdir, readFile, open, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fail, normalizeHash } from './core.mjs';

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

  // Claim each payment transaction ONCE across all organizations/intents,
  // not merely once inside a tenant. A successful blockchain payment can
  // otherwise be replayed as multiple independent organization issuances.
  //
  // This reference implementation is safe for one process and one shared
  // local filesystem only. Production must use a transactional DB unique
  // index on (chain_id, payment_tx_hash) with durable migrations/backfill.
  async claimPayment(paymentTxHash, tenantId, intentId) {
    const txHash = normalizeHash(paymentTxHash, 'payment transaction hash');
    const directory = path.join(this.root, '_payment_claims');
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const claimPath = path.join(directory, txHash.slice(2) + '.json');
    const holder = { transactionHash: txHash, tenantId, intentId };
    try {
      const fd = await open(claimPath, 'wx', 0o600);
      try {
        await fd.writeFile(JSON.stringify(holder) + '\n', 'utf8');
        await fd.sync();
      } finally {
        await fd.close();
      }
      return;
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
    }

    // Fail closed for corrupt/partially written claims. Do not reset/remove
    // claims automatically; a restart must never release a paid reference.
    let found;
    // With two concurrent writers, the second request may observe an
    // exclusive reservation before its owner has finished writing JSON.
    // A short, bounded wait distinguishes that expected race from a truly
    // corrupt persisted claim. Never erase a partially written claim.
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        found = JSON.parse(await readFile(claimPath, 'utf8'));
        break;
      } catch {
        if (attempt === 7) {
          throw fail('Payment reservation requires operator reconciliation', 503);
        }
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    if (found.transactionHash !== txHash ||
        typeof found.tenantId !== 'string' ||
        typeof found.intentId !== 'string') {
      throw fail('Invalid saved payment reservation', 503);
    }
    if (found.tenantId !== tenantId || found.intentId !== intentId) {
      throw fail('Payment transaction already linked to another intent', 409);
    }
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
      // Persist a global payment-transaction claim before committing the
      // intent. If writing the intent fails, its own claim remains retryable
      // by the SAME intent; another intent cannot steal or reuse the fee.
      // Never use this local claim store as a multi-host production ledger.
      await this.claimPayment(paymentTxHash, tenantId, validId);
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
