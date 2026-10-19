"""Regression tests for approved-master visual diff masks; no customer PDF."""
import io
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
from visual_acceptance import pixel_diff, MASKS


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
        self.assertIsNone(self.compare([(350, 1003, (0, 0, 0, 255))]))

    def test_original_logo_must_not_change(self):
        self.assertIsNotNone(self.compare([(99, 110, (0, 0, 0, 255))]))

    def test_immutable_verified_status_panel_must_not_change(self):
        self.assertIsNotNone(self.compare([(150, 830, (0, 0, 0, 255))]))

    def test_alpha_only_change_outside_data_is_detected(self):
        self.assertIsNotNone(self.compare([(99, 110, (255, 255, 255, 100))]))

    def test_summary_immutable_divider_coordinates_are_never_masked(self):
        """Codex's old 65px clears erased these approved blue table lines."""
        immutable_lines = (533, 534, 577, 578, 622, 623, 668, 713)
        for rule in immutable_lines:
            for x0, y0, x1, y1 in MASKS:
                if x0 < 900 and x1 > 340 and y0 < 760 and y1 > 480:
                    self.assertFalse(y0 <= rule < y1,
                                     f"Approved divider y={rule} covered by {x0,y0,x1,y1}")

    def test_explorer_button_is_outside_dynamic_data_mask(self):
        for box in MASKS:
            x0, y0, x1, y1 = box
            self.assertFalse(x0 <= 795 < x1 and y0 <= 1280 < y1,
                             f"VIEW ON EXPLORER button covered by {box}")

    def test_static_rule_change_is_detected_even_when_sample_text_changes(self):
        self.assertIsNotNone(self.compare([(500, 533, (12, 12, 12, 255))]))


if __name__ == "__main__":
    unittest.main()
