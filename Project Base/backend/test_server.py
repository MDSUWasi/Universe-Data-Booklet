import tempfile
import time
import unittest
from pathlib import Path

from backend.server import CacheStore


class CacheStoreTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.store = CacheStore(Path(self.temp_dir.name) / "cache.sqlite3", max_bytes=1024)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_fresh_entry_is_returned_without_fetching(self):
        self.store.put("key", b"saved", "text/plain")

        def unexpected_fetch():
            raise AssertionError("fresh entry should not fetch")

        result = self.store.get_or_fetch("key", unexpected_fetch, ttl=30, stale_ttl=60)
        self.assertEqual(result.entry.body, b"saved")
        self.assertEqual(result.state, "HIT")

    def test_expired_entry_refreshes_on_success(self):
        self.store.put("key", b"old", "text/plain", cached_at=time.time() - 60)
        result = self.store.get_or_fetch("key", lambda: (b"new", "text/plain"), ttl=30, stale_ttl=120)
        self.assertEqual(result.entry.body, b"new")
        self.assertEqual(result.state, "MISS")

    def test_upstream_failure_uses_stale_entry_within_stale_window(self):
        self.store.put("key", b"saved", "text/plain", cached_at=time.time() - 60)

        def unavailable():
            raise OSError("offline")

        result = self.store.get_or_fetch("key", unavailable, ttl=30, stale_ttl=120)
        self.assertEqual(result.entry.body, b"saved")
        self.assertEqual(result.state, "STALE")

    def test_immutable_entry_does_not_refresh_after_a_long_time(self):
        self.store.put("versioned-tile", b"tile", "image/jpeg", cached_at=1)

        def unexpected_fetch():
            raise AssertionError("immutable entry should not refresh")

        result = self.store.get_or_fetch(
            "versioned-tile", unexpected_fetch, ttl=None, stale_ttl=None
        )
        self.assertEqual(result.entry.body, b"tile")
        self.assertEqual(result.state, "HIT")

    def test_cache_size_is_bounded_by_oldest_entries(self):
        self.store.put("older", b"a" * 700, "text/plain", cached_at=1)
        self.store.put("newer", b"b" * 700, "text/plain", cached_at=2)
        self.assertIsNone(self.store.get("older"))
        self.assertIsNotNone(self.store.get("newer"))


if __name__ == "__main__":
    unittest.main()