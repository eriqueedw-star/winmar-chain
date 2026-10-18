/*
 * Read-only Winmar Chain proof validation for BOTH public wallet issuance and
 * approved organization API integrations.
 *
 * Neither a successful fee transaction nor a user-supplied certificate URL is
 * a document verification. Require the distinct registration receipt and
 * current on-chain document state. This library never signs transactions.
 */
(function (root) {
  'use strict';

  const MAINNET_CHAIN_ID = '0xb948e0';
  const FEE_ADDRESS = '0xcec232bd11f03006ecc80917f5cd55bbf247617d';
  const VERIFICATION_ADDRESS = '0x53fb6ba2997a50d3ddfff5395a3bb9b7b24b7aef';
  const TREASURY_ADDRESS = '0x2d26e199f9be1a907239e403c4fad14c0856e7fd';
  const FEE_WEI = 2100000000000000n;
  const FEE_SELECTOR = '0x8609cad1'; // payDocument(bytes32)
  const DOCUMENT_SELECTOR = '0xb10d6b41'; // getDocument(bytes32)
  const ISSUER_SELECTOR = '0x38a7543e'; // issuers(address)
  const FEE_EVENT = '0x3e8af3edd4cc6c38e4b22a0110ebdcaa13f693b0954b418c7fddcae70f8f864d';
  const REGISTERED_EVENT = '0x5b89de9f4846bfc83db0a655fd2c69d1a30f49b5f2b09c485c167d39374210f2';
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  function docId(value) {
    if (typeof value !== 'string' || !/^0x[0-9a-f]{64}$/i.test(value)) throw new Error('Invalid document ID');
    return value.toLowerCase();
  }

  function wordAddress(topic) {
    if (!/^0x[0-9a-f]{64}$/i.test(topic || '')) throw new Error('Invalid issuer/payer address topic');
    const prefix = topic.slice(2, 26);
    if (!/^0{24}$/i.test(prefix)) throw new Error('Malformed indexed address topic');
    return ('0x' + topic.slice(-40)).toLowerCase();
  }

  function receiptOk(receipt, address) {
    return receipt && receipt.status === '0x1' &&
      typeof receipt.to === 'string' && receipt.to.toLowerCase() === address;
  }

  function paidLog(receipt, hash, payer) {
    return (receipt.logs || []).some((log) => {
      const t = log.topics || [];
      return String(log.address).toLowerCase() === FEE_ADDRESS &&
        String(t[0]).toLowerCase() === FEE_EVENT &&
        String(t[1]).toLowerCase() === hash &&
        wordAddress(t[2]) === payer &&
        wordAddress(t[3]) === TREASURY_ADDRESS &&
        typeof log.data === 'string' && BigInt(log.data) === FEE_WEI;
    });
  }

  function decodeDocument(hex) {
    if (typeof hex !== 'string' || !/^0x(?:[a-f0-9]{64}){5}$/i.test(hex)) return null;
    const data = hex.slice(2);
    const words = Array.from({ length: 5 }, (_, i) => data.slice(i * 64, (i + 1) * 64));
    const hash = ('0x' + words[0]).toLowerCase();
    const issuer = ('0x' + words[1].slice(24)).toLowerCase();
    const issuedAt = BigInt('0x' + words[2]);
    const revokedAt = BigInt('0x' + words[3]);
    if (issuer === ZERO_ADDRESS || issuedAt === 0n) return null;
    return { hash, issuer, issuedAt, revokedAt, metadataHash: '0x' + words[4] };
  }

  async function getRecord(rpc, hash) {
    const raw = await rpc('eth_call', [{
      to: VERIFICATION_ADDRESS, data: DOCUMENT_SELECTOR + hash.slice(2),
    }, 'latest']);
    return decodeDocument(raw);
  }

  async function authorized(rpc, issuer) {
    const data = ISSUER_SELECTOR + issuer.slice(2).padStart(64, '0');
    const response = await rpc('eth_call', [{ to: VERIFICATION_ADDRESS, data }, 'latest']);
    return typeof response === 'string' && /^0x[0-9a-f]{64}$/i.test(response) && BigInt(response) === 1n;
  }

  async function registrationEvent(rpc, hash, issuer, paymentBlock) {
    const upper = BigInt(await rpc('eth_blockNumber'));
    const from = BigInt(paymentBlock);
    const issuerTopic = '0x' + issuer.slice(2).padStart(64, '0');
    // Chunked logs bound public RPC query cost and provider log-range limits.
    for (let start = from; start <= upper; start += 500n) {
      const finish = start + 499n < upper ? start + 499n : upper;
      const logs = await rpc('eth_getLogs', [{
        address: VERIFICATION_ADDRESS,
        fromBlock: '0x' + start.toString(16),
        toBlock: '0x' + finish.toString(16),
        topics: [REGISTERED_EVENT, hash, hash, issuerTopic],
      }]);
      for (const log of logs || []) {
        if (String(log.address).toLowerCase() !== VERIFICATION_ADDRESS ||
            !/^0x[0-9a-f]{64}$/i.test(log.transactionHash || '')) continue;
        const txReceipt = await rpc('eth_getTransactionReceipt', [log.transactionHash]);
        if (!receiptOk(txReceipt, VERIFICATION_ADDRESS) ||
            String(txReceipt.blockHash).toLowerCase() !== String(log.blockHash).toLowerCase()) continue;
        // Check that the proof log is present in the actual receipt, not only
        // returned by a loose indexer query.
        const matching = (txReceipt.logs || []).some((rlog) =>
          String(rlog.address).toLowerCase() === VERIFICATION_ADDRESS &&
          (rlog.topics || []).map((t) => String(t).toLowerCase()).join(',') ===
            [REGISTERED_EVENT, hash, hash, issuerTopic].join(','));
        if (!matching) continue;
        return { transactionHash: log.transactionHash, blockNumber: txReceipt.blockNumber };
      }
    }
    return null;
  }

  async function check(rpc, sourceHash, paymentTransactionHash) {
    const hash = docId(sourceHash);
    if (!/^0x[0-9a-f]{64}$/i.test(paymentTransactionHash || '')) throw new Error('Missing payment transaction reference');
    const network = await rpc('eth_chainId');
    if (String(network).toLowerCase() !== MAINNET_CHAIN_ID) throw new Error('Wrong blockchain network');

    const payment = await rpc('eth_getTransactionReceipt', [paymentTransactionHash]);
    if (!payment) return { status: 'payment_pending' };
    if (!receiptOk(payment, FEE_ADDRESS)) throw new Error('Payment transaction failed or targets another contract');
    const paymentTx = await rpc('eth_getTransactionByHash', [paymentTransactionHash]);
    if (!paymentTx || String(paymentTx.to).toLowerCase() !== FEE_ADDRESS ||
        BigInt(paymentTx.value || '0x0') !== FEE_WEI ||
        String(paymentTx.input).toLowerCase() !== FEE_SELECTOR + hash.slice(2)) {
      throw new Error('Payment does not match this document and exact contract fee');
    }
    const payer = String(paymentTx.from).toLowerCase();
    if (!/^0x[0-9a-f]{40}$/i.test(payer) || !paidLog(payment, hash, payer)) {
      throw new Error('Confirmed transaction lacks a matching FeePaid event');
    }

    let record;
    try { record = await getRecord(rpc, hash); } catch {
      // Some contract versions revert for an as-yet-unknown document ID.
      // A successful payment is NOT sufficient to issue an official certificate.
      return { status: 'registration_pending', paymentTransactionHash };
    }
    if (!record) return { status: 'registration_pending', paymentTransactionHash };
    if (record.hash !== hash) throw new Error('On-chain hash does not match source PDF');
    if (record.revokedAt !== 0n) throw new Error('On-chain document has been revoked');
    if (!(await authorized(rpc, record.issuer))) throw new Error('Document issuer is not currently authorized');

    const event = await registrationEvent(rpc, hash, record.issuer, payment.blockNumber);
    if (!event) return { status: 'registration_pending', paymentTransactionHash };
    const block = await rpc('eth_getBlockByNumber', [event.blockNumber, false]);
    if (!block?.timestamp || BigInt(block.timestamp) !== record.issuedAt) {
      throw new Error('On-chain registration timestamp does not match its block');
    }
    return {
      status: 'verified',
      documentId: hash,
      sha256: hash.slice(2),
      issuerWallet: record.issuer,
      registrationTransactionHash: event.transactionHash,
      paymentTransactionHash,
      registrationBlockNumber: Number(BigInt(event.blockNumber)),
      issuedAt: new Date(Number(record.issuedAt) * 1000).toISOString()
        .replace('T', ' ').replace('.000Z', ' UTC'),
      verificationUrl: 'https://scan.winmarchain.io/verify/' + hash,
    };
  }

  root.WinmarVerificationProof = {
    check, docId, decodeDocument,
    // Exposed for deterministic, transaction-free unit tests.
    constants: { MAINNET_CHAIN_ID, FEE_ADDRESS, VERIFICATION_ADDRESS, TREASURY_ADDRESS,
      FEE_WEI, FEE_SELECTOR, FEE_EVENT, REGISTERED_EVENT },
  };
})(typeof window === 'undefined' ? globalThis : window);
