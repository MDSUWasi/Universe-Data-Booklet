import json
import tempfile
import unittest
from pathlib import Path

from backend.build_terrain_assets import DEFAULT_OUTPUT, SITES, build_asset


class TerrainAssetTests(unittest.TestCase):
    def test_committed_assets_match_all_catalogued_site_grids(self):
        expected_cells = 128 * 128
        for site_id in SITES:
            with self.subTest(site=site_id):
                path = DEFAULT_OUTPUT / f"{site_id}.json"
                self.assertTrue(path.is_file())
                asset = json.loads(path.read_text(encoding="utf-8"))
                self.assertEqual(asset["schema_version"], 1)
                self.assertEqual(asset["grid_size"] ** 2, expected_cells)
                self.assertEqual(asset["id"], site_id)
                for key in ("elevation_u8", "slope_u8", "roughness_u8", "valid_mask", "slope_screen_mask"):
                    self.assertEqual(len(asset[key]), expected_cells)
                self.assertGreater(asset["valid_fraction"], 0)
                self.assertLessEqual(asset["valid_fraction"], 1)

    def test_builder_uses_real_lunar_safe_screen(self):
        # This test requires the gitignored LRO DEM raster (data/moon/moon_30m.tif).
        # Skip gracefully when the external data file is not present in the checkout.
        dem_path = Path(__file__).resolve().parents[1] / "data" / "moon" / "moon_30m.tif"
        if not dem_path.is_file():
            self.skipTest("LRO DEM raster not present (gitignored external data)")
        with tempfile.TemporaryDirectory() as directory:
            asset_path = build_asset("moon", SITES["moon"], Path(directory))
            asset = json.loads(asset_path.read_text(encoding="utf-8"))
        self.assertEqual(asset["window_m"], 3000)
        self.assertGreater(asset["slope_screen_fraction"], 0)
        self.assertLess(asset["slope_screen_fraction"], 1)
        self.assertTrue(asset["source_dem"].endswith("moon_30m.tif"))


if __name__ == "__main__":
    unittest.main()
