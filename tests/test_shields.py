import unittest
import os
import sys

# Ensure src is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from src.shields.filter_engine import FilterEngine

class TestReconShields(unittest.TestCase):
    def setUp(self):
        self.engine = FilterEngine()
        filter_path = os.path.join(os.path.dirname(__file__), "..", "config", "filters", "default-trackers.txt")
        with open(filter_path, "r", encoding="utf-8") as f:
            self.engine.load_rules(f.read())

    def test_block_known_trackers(self):
        self.assertTrue(self.engine.should_block("https://www.google-analytics.com/analytics.js"))
        self.assertTrue(self.engine.should_block("https://subdomain.doubleclick.net/ad.js"))
        self.assertTrue(self.engine.should_block("https://telemetry.mozilla.org/submit"))
        self.assertTrue(self.engine.should_block("https://criteo.com/delivery/lg.php"))

    def test_allow_legitimate_sites(self):
        self.assertFalse(self.engine.should_block("https://recontowers.com/apps"))
        self.assertFalse(self.engine.should_block("https://duckduckgo.com/?q=privacy"))
        self.assertFalse(self.engine.should_block("https://github.com/neogentrics"))

    def test_strip_tracking_parameters(self):
        dirty_url = "https://example.com/item?id=42&utm_source=twitter&utm_campaign=winter&fbclid=IwAR987654321"
        clean = self.engine.strip_tracking_params(dirty_url)
        self.assertEqual(clean, "https://example.com/item?id=42")

if __name__ == "__main__":
    unittest.main()
