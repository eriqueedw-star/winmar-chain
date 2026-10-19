"""Safety and path regression tests for standalone Explorer verify UI release."""
from __future__ import annotations

import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "build-document-verification-explorer.py"
spec = importlib.util.spec_from_file_location("winmar_explorer_package", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ExplorerReleaseTests(unittest.TestCase):
    def test_static_release_is_byte_identical_to_reviewed_assets(self):
        with tempfile.TemporaryDirectory() as td:
            out = Path(td) / "dist"
            data = module.assemble(out)
            self.assertEqual(len(data["public_files"]), 6)
            for name in module.ALLOWLIST:
                source = (module.WEB / name).read_bytes()
                target = (out / "site" / "document-verification" / name).read_bytes()
                self.assertEqual(source, target)
                self.assertEqual(hashlib.sha256(source).hexdigest(),
                                 data["sha256"]["document-verification/" + name])
            self.assertEqual((out / "site" / "verify.html").read_bytes(),
                             (module.WEB / "verify.html").read_bytes())

    def test_manifest_is_explicitly_non_deployed_and_read_only(self):
        with tempfile.TemporaryDirectory() as td:
            out = Path(td) / "dist"
            module.assemble(out)
            manifest = json.loads((out / "manifest.json").read_text())
            self.assertEqual(manifest["status"], "review-only-not-deployed")
            self.assertFalse(manifest["private_keys"])
            self.assertFalse(manifest["changes_blockchain_state"])
            self.assertTrue(manifest["requires_operator_nginx_review"])
            self.assertIn(module.SAMPLE_DOC_ID, manifest["sample_url"])
            self.assertTrue((out / "SHA256SUMS").is_file())
            self.assertEqual(len(manifest["public_files"]), 6)

    def test_source_pdf_and_sensitive_deploy_files_are_not_packaged(self):
        with tempfile.TemporaryDirectory() as td:
            out = Path(td) / "dist"
            module.assemble(out)
            packaged = {str(x.relative_to(out)) for x in out.rglob("*") if x.is_file()}
            self.assertEqual(packaged,
                             {"manifest.json", "SHA256SUMS", "site/verify.html"} |
                             {"site/document-verification/" + x for x in module.ALLOWLIST})
            self.assertFalse(any(".env" in x or x.endswith(".pdf") or
                                 "private" in x.lower() for x in packaged))

    def test_refuses_existing_release_directory_without_overwriting(self):
        with tempfile.TemporaryDirectory() as td:
            out = Path(td) / "dist"
            out.mkdir()
            (out / "keep.txt").write_text("unchanged", encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "nonempty"):
                module.assemble(out)
            self.assertEqual((out / "keep.txt").read_text(), "unchanged")


if __name__ == "__main__":
    unittest.main()
