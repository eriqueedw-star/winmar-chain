"""Read-only proof/asset-gate tests; do not produce a customer certificate."""
import sys
import unittest
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[1] / "tools"
sys.path.insert(0, str(TOOLS))
from approved_master import approve_exact_master, APPROVED_SHA256
from build_verified_pdf import (
    verify_document, CHAIN_ID, PAYMENT_CONTRACT, VERIFICATION_CONTRACT,
    TREASURY, FEE_WEI, PAY_SELECTOR, FEE_EVENT, REG_EVENT, indexed,
)

DIGEST = "0x477a80f1f39d85e3b746f621a5271a17c3aa1b6adc9d88401cc7bbf58ae209fc"
PAYER = "0xb6e21d958893601f4a90a71ecd41547d54c0b844"
ISSUER = "0x853a35b5318fd219ebf98b2a12ca346a9853d975"
PAYMENT = "0x" + "ab" * 32
REGISTRATION = "0x" + "cd" * 32
BLOCKHASH = "0x" + "56" * 32
ISSUED_AT = 1792339938


def word(n):
    return format(n, "064x")


class RpcFixture:
    def __init__(self, *, paid=True, registered=True, revoked=False, fee_ok=True, issuer_ok=True):
        self.paid = paid
        self.registered = registered
        self.revoked = revoked
        self.fee_ok = fee_ok
        self.issuer_ok = issuer_ok
        self.calls = []

    def __call__(self, method, params=None):
        self.calls.append(method)
        params = params or []
        if method == "eth_chainId":
            return hex(CHAIN_ID)
        if method == "eth_getTransactionByHash":
            if params[0] == PAYMENT:
                return {"to": PAYMENT_CONTRACT, "from": PAYER,
                        "input": "0x" + PAY_SELECTOR + DIGEST[2:],
                        "value": hex(FEE_WEI if self.fee_ok else 123)}
            return {"to": VERIFICATION_CONTRACT, "from": ISSUER, "value": "0x0"}
        if method == "eth_getTransactionReceipt":
            if params[0] == PAYMENT:
                return {
                    "status": "0x1" if self.paid else "0x0",
                    "to": PAYMENT_CONTRACT, "blockNumber": "0x64",
                    "logs": [{
                        "address": PAYMENT_CONTRACT,
                        "topics": [FEE_EVENT, DIGEST, indexed(PAYER), indexed(TREASURY)],
                        "data": hex(FEE_WEI),
                    }]
                }
            return {
                "status": "0x1", "to": VERIFICATION_CONTRACT,
                "blockNumber": "0x68", "blockHash": BLOCKHASH,
                "logs": [self.registration_log()],
            }
        if method == "eth_call":
            data = params[0]["data"]
            if data.startswith("0xb10d6b41"):
                if not self.registered:
                    raise ValueError("Unregistered")
                return "0x" + DIGEST[2:] + indexed(ISSUER)[2:] + word(ISSUED_AT) + word(int(self.revoked)) + "0"*64
            if data.startswith("0x38a7543e"):
                return "0x" + word(int(self.issuer_ok))
        if method == "eth_blockNumber":
            return "0x70"
        if method == "eth_getLogs":
            return [self.registration_log()] if self.registered else []
        if method == "eth_getBlockByNumber":
            return {"timestamp": hex(ISSUED_AT)}
        raise AssertionError("Unexpected RPC method " + method)

    @staticmethod
    def registration_log():
        return {
            "address": VERIFICATION_CONTRACT,
            "topics": [REG_EVENT, DIGEST, DIGEST, indexed(ISSUER)],
            "transactionHash": REGISTRATION, "blockHash": BLOCKHASH,
        }


class TestCertificateProof(unittest.TestCase):
    def test_matching_fee_and_separate_registration_required(self):
        rpc = RpcFixture()
        verified = verify_document(rpc, DIGEST, PAYMENT)
        self.assertEqual(verified["document_id"], DIGEST)
        self.assertEqual(verified["registration_tx"], REGISTRATION)
        self.assertEqual(verified["issuer_wallet"], ISSUER)
        self.assertEqual(verified["block_number"], 104)
        self.assertEqual(verified["verification_url"],
                         "https://scan.winmarchain.io/verify/" + DIGEST)
        self.assertIn("eth_getLogs", rpc.calls)

    def test_paid_without_registration_cannot_be_verified(self):
        rpc = RpcFixture(registered=False)
        with self.assertRaisesRegex(ValueError, "Unregistered"):
            verify_document(rpc, DIGEST, PAYMENT)

    def test_failed_payment_blocks_registration_even_if_record_exists(self):
        with self.assertRaisesRegex(ValueError, "Payment not confirmed"):
            verify_document(RpcFixture(paid=False), DIGEST, PAYMENT)

    def test_wrong_fee_blocks_issuance(self):
        with self.assertRaisesRegex(ValueError, "Wrong payment value"):
            verify_document(RpcFixture(fee_ok=False), DIGEST, PAYMENT)

    def test_revoked_document_rejected(self):
        with self.assertRaisesRegex(ValueError, "REVOKED"):
            verify_document(RpcFixture(revoked=True), DIGEST, PAYMENT)

    def test_revoked_issuer_rejected(self):
        with self.assertRaisesRegex(ValueError, "not currently authorized"):
            verify_document(RpcFixture(issuer_ok=False), DIGEST, PAYMENT)

    def test_invalid_hash_rejected_before_rpc(self):
        with self.assertRaisesRegex(ValueError, "Invalid SHA-256"):
            verify_document(RpcFixture(), "0xbroken", PAYMENT)

    def test_all_shipped_certificate_assets_are_the_owner_approved_original(self):
        root = Path(__file__).resolve().parents[3]
        approved_paths = (
            root / "assets" / "winmar-verification-certificate-master.png",
            root / "assets" / "winmar-verification-certificate-public.png",
            root / "services" / "winmar-document-verification" / "web" / "winmar-verification-certificate-master.png",
            root / "services" / "winmar-document-verification" / "web" / "winmar-verification-certificate-public.png",
        )
        self.assertEqual(len(APPROVED_SHA256), 64)
        for asset in approved_paths:
            with self.subTest(asset=asset):
                self.assertEqual(approve_exact_master(asset), asset.read_bytes())


if __name__ == "__main__":
    unittest.main()
