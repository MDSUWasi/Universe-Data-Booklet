import unittest

from backend.server import AppHandler


class ResponseCapture:
    def __init__(self):
        self.status = None
        self.payload = None

    def _json(self, status, payload):
        self.status = status
        self.payload = payload

    @staticmethod
    def _read_csv(path):
        return AppHandler._read_csv(path)


class DataEndpointTests(unittest.TestCase):
    def call_endpoint(self, endpoint):
        capture = ResponseCapture()
        endpoint(capture)
        self.assertEqual(capture.status, 200)
        return capture.payload

    def test_sites_endpoint_reads_all_five_summary_records(self):
        payload = self.call_endpoint(AppHandler._sites)
        self.assertEqual(payload["source"], "output/reports/all_sites_comparison.csv")
        self.assertEqual({site["id"] for site in payload["sites"]}, {"moon", "mcmurdo", "axel", "kerguelen", "jezero"})
        moon = next(site for site in payload["sites"] if site["id"] == "moon")
        self.assertEqual(moon["max_rough_m"], 7.775)

    def test_patch_endpoint_preserves_filled_flags_and_body(self):
        payload = self.call_endpoint(AppHandler._patches)
        records = payload["records"]
        self.assertGreater(len(records), 5)
        self.assertEqual({record["body"] for record in records}, {"Moon", "Earth", "Mars"})
        self.assertTrue(any(record["filled"] for record in records))
        self.assertTrue(any(not record["filled"] for record in records))

    def test_scale_endpoint_marks_the_two_windows_as_non_comparable(self):
        payload = self.call_endpoint(AppHandler._scale_sensitivity)
        self.assertEqual(payload["fingerprint_window_m"], 12)
        self.assertEqual(payload["comparison_window_m"], 90)
        self.assertEqual(len(payload["fingerprints"]), 3)
        self.assertIn("not as directly comparable", payload["warning"])


if __name__ == "__main__":
    unittest.main()
