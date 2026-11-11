/*
 * Idempotent payment receipt processing. No private keys, RPC URLs or
 * runtime loop are contained in this module; tests inject dependencies.
 *
 * Safety invariants:
 * - Never call a default/zero tuple a registered document.
 * - Never advance past a failed/unconfirmed paid event.
 * - Persist the issuer TX hash before waiting for confirmation.
 * - Replay a small block overlap after restart (dedup via processed map).
 */
export const PAYMENT_DEPLOYMENT_BLOCK = 780432;
export const MAX_BLOCKS_PER_BATCH = 250;
export const REPLAY_BLOCKS = 6;
export const CONFIRMATIONS = 2;
const ZERO = '0x0000000000000000000000000000000000000000';
const ID_RE = /^0x[0-9a-f]{64}$/i;

function numberSafe(value, description) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) throw new Error(`Invalid ${description}`);
  return n;
}

export function assessDocument(record, documentId) {
  if (!ID_RE.test(documentId || '')) throw new Error('Invalid document hash');
  if (!record) return 'missing';
  const documentHash = String(record.documentHash ?? record[0] ?? '').toLowerCase();
  const issuer = String(record.issuer ?? record[1] ?? '').toLowerCase();
  const issuedAt = BigInt(record.issuedAt ?? record[2] ?? 0);
  const revokedAt = BigInt(record.revokedAt ?? record[3] ?? 0);
  // Mapping getters normally return zero-filled structs, not a revert.
  if (issuedAt === 0n && (documentHash === '0x' + '0'.repeat(64) || !documentHash) &&
      (!issuer || issuer === ZERO)) return 'missing';
  if (!ID_RE.test(documentHash) || documentHash !== documentId.toLowerCase()) {
    throw new Error('Existing document ID has conflicting on-chain fingerprint');
  }
  if (!/^0x[0-9a-f]{40}$/.test(issuer) || issuer === ZERO || issuedAt === 0n) {
    throw new Error('Existing document has malformed issuer or timestamp');
  }
  if (revokedAt !== 0n) throw new Error('Document has been revoked; manual review required');
  return 'registered';
}

export function selectWindow(previousBlock, latestBlock) {
  const latest = numberSafe(latestBlock, 'latest block');
  const safeTip = latest - CONFIRMATIONS;
  const prev = previousBlock === null || previousBlock === undefined ?
    null : numberSafe(previousBlock, 'saved cursor');
  const start = prev === null ? PAYMENT_DEPLOYMENT_BLOCK :
    Math.max(PAYMENT_DEPLOYMENT_BLOCK, prev - REPLAY_BLOCKS + 1);
  if (start > safeTip) return null;
  return { from: start, to: Math.min(safeTip, start + MAX_BLOCKS_PER_BATCH - 1) };
}

function unknownDocumentRevert(error) {
  const message = String(error?.shortMessage || error?.reason || error?.message || '');
  // Only an explicit documented "not found" revert can be treated as missing.
  // Network errors, malformed RPC responses and unrelated CALL_EXCEPTIONs
  // are fatal; otherwise we might send a duplicate issuer transaction.
  return /document (does not exist|not found|not registered)|unknown document/i.test(message);
}

export async function processWindow({ latestBlock, state, getEvents,
  getDocument, registerDocument, getRegistrationReceipt, saveState }) {
  if (!state || typeof state !== 'object') throw new Error('Worker state is unavailable');
  state.processed ??= {};
  state.pending ??= {};
  const window = selectWindow(state.lastBlock ?? null, latestBlock);
  if (!window) return { status: 'idle', cursor: state.lastBlock ?? null };

  const events = await getEvents(window.from, window.to);
  if (!Array.isArray(events)) throw new Error('Payment event query returned invalid data');
  events.sort((a, b) => Number(a.blockNumber) - Number(b.blockNumber) ||
    Number(a.index ?? a.logIndex ?? 0) - Number(b.index ?? b.logIndex ?? 0));

  let processed = 0;
  for (const event of events) {
    const documentId = String(event.args?.documentId ?? '');
    if (!ID_RE.test(documentId) || !ID_RE.test(event.transactionHash || '')) {
      throw new Error('Malformed on-chain FeePaid event');
    }
    const key = `${event.transactionHash.toLowerCase()}:${documentId.toLowerCase()}`;
    if (state.processed[key]) continue;

    let record;
    try {
      record = await getDocument(documentId);
    } catch (error) {
      if (!unknownDocumentRevert(error)) throw error;
      record = null;
    }

    let registrationTransactionHash = state.pending[key]?.transactionHash || null;
    let disposition = 'already_registered';
    if (assessDocument(record, documentId) === 'missing') {
      disposition = 'registered';
      if (!registrationTransactionHash) {
        const pendingTx = await registerDocument(documentId);
        if (!ID_RE.test(pendingTx?.hash || '')) {
          throw new Error('Issuer did not provide a valid registration TX hash');
        }
        registrationTransactionHash = pendingTx.hash;
        state.pending[key] = { transactionHash: registrationTransactionHash };
        await saveState(state);
      }
      const receipt = await getRegistrationReceipt(registrationTransactionHash);
      if (!receipt) throw new Error('Issuer transaction pending; will retry without resending');
      if (Number(receipt.status) !== 1) {
        throw new Error('Issuer transaction failed; manual review required before retry');
      }
      // Verify actual registration rather than relying only on a mined TX.
      const confirmed = await getDocument(documentId);
      if (assessDocument(confirmed, documentId) !== 'registered') {
        throw new Error('Issuer TX mined but matching document record is not yet proven');
      }
    }

    state.processed[key] = {
      status: disposition,
      paymentTx: event.transactionHash,
      verificationTx: registrationTransactionHash,
      block: numberSafe(event.blockNumber, 'fee block'),
    };
    delete state.pending[key];
    await saveState(state);
    processed++;
  }

  // Cursor moves ONLY after the entire scanned window completed without an
  // unhandled paid event. Otherwise previous cursor remains and event retries.
  state.lastBlock = Math.max(state.lastBlock ?? 0, window.to);
  await saveState(state);
  return { status: 'processed', from: window.from, to: window.to, processed,
    cursor: state.lastBlock };
}
