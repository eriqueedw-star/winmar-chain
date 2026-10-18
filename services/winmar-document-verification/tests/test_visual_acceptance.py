"""Regression tests for approved-master visual diff masks; no customer PDF."""
import io
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
from visual_acceptance import pixel_diff


class TestImmutableArtwork(unittest.TestCase):
    @staticmethod
    def fixture(changes=()):
        original = Image.new("RGBA", (1055, 1491), (255, 255, 255, 255))
        raw = io.BytesIO()
        original.save(raw, format="PNG")
        altered = original.copy()
        for x, y, color in changes:
            altered.putpixel((x, y), color)
        f = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
        with f:
            altered.save(f, format="PNG")
        return raw.getvalue(), f.name

    def compare(self, changes):
        original, path = self.fixture(changes)
        try:
            return pixel_diff(original, path)[0]
        finally:
            Path(path).unlink(missing_ok=True)

    def test_base_image_passes(self):
        self.assertIsNone(self.compare([]))

    def test_dynamic_qr_only_passes(self):
        self.assertIsNone(self.compare([(840, 100, (0, 0, 0, 255))]))

    def test_sha_data_box_only_passes(self):
        self.assertIsNone(self.compare([(350, 968, (0, 0, 0, 255))]))

    def test_original_logo_must_not_change(self):
        self.assertIsNotNone(self.compare([(99, 110, (0, 0, 0, 255))]))

    def test_immutable_verified_status_panel_must_not_change(self):
        self.assertIsNotNone(self.compare([(150, 830, (0, 0, 0, 255))]))

    def test_alpha_only_change_outside_data_is_detected(self):
        self.assertIsNotNone(self.compare([(99, 110, (255, 255, 255, 100))]))


if __name__ == "__main__":
    unittest.main()
