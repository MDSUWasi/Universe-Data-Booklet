#!/usr/bin/env python3
"""Unit tests for the Universe Data Booklet backend logic.

Run with:  python -m pytest tests/   OR   python tests/test_habitability.py
"""
import os
import sys
import unittest

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src', 'backend'))

from client import (
    sanitize_input,
    safe_float,
    calculate_earth_similarity,
    calculate_water_probability,
    calculate_oxygen_likelihood,
    enrich_planet_data,
)


class TestSanitizeInput(unittest.TestCase):
    def test_preserves_name_characters(self):
        # Names with spaces, dots, hyphens should survive lookup
        self.assertEqual(sanitize_input("HD 10180"), "HD 10180")
        self.assertEqual(sanitize_input("Kepler-186 f"), "Kepler-186 f")
        self.assertEqual(sanitize_input("Proxima Cen b"), "Proxima Cen b")

    def test_strips_dangerous_chars(self):
        self.assertEqual(sanitize_input("<script>alert('x')</script>"), "scriptalertxscript")
        self.assertEqual(sanitize_input("abc; DROP TABLE"), "abc DROP TABLE")

    def test_empty_input(self):
        self.assertEqual(sanitize_input(""), "")
        self.assertEqual(sanitize_input(None), "")

    def test_truncation(self):
        self.assertEqual(len(sanitize_input("x" * 200)), 100)


class TestSafeFloat(unittest.TestCase):
    def test_valid_values(self):
        self.assertEqual(safe_float("3.5", 1.0), 3.5)
        self.assertEqual(safe_float("0", 1.0), 0.0)

    def test_invalid_values(self):
        self.assertEqual(safe_float("abc", 1.0), 1.0)
        self.assertEqual(safe_float("", 1.0), 1.0)
        self.assertEqual(safe_float(None, 1.0), 1.0)


class TestEarthSimilarity(unittest.TestCase):
    def test_earth_like_near_one(self):
        # Earth radius & mass => ESI ~ 1
        planet = {'pl_rade': 1.0, 'pl_bmasse': 1.0}
        esi = calculate_earth_similarity(planet)
        self.assertAlmostEqual(esi, 1.0, delta=0.01)

    def test_extreme_planet_low_esi(self):
        planet = {'pl_rade': 10.0, 'pl_bmasse': 100.0}
        esi = calculate_earth_similarity(planet)
        self.assertLess(esi, 0.5)

    def test_missing_values_default(self):
        planet = {}
        esi = calculate_earth_similarity(planet)
        self.assertAlmostEqual(esi, 1.0, delta=0.01)


class TestWaterProbability(unittest.TestCase):
    def test_habitable_region(self):
        planet = {'pl_orbper': 300}
        self.assertIn("High", calculate_water_probability(planet))

    def test_too_hot(self):
        planet = {'pl_orbper': 20}
        self.assertIn("Low (Too Hot", calculate_water_probability(planet))

    def test_too_cold(self):
        planet = {'pl_orbper': 5000}
        self.assertIn("Low (Too Cold", calculate_water_probability(planet))


class TestOxygenLikelihood(unittest.TestCase):
    def test_terrestrial_candidate(self):
        planet = {'pl_bmasse': 1.0, 'pl_rade': 1.0}
        self.assertIn("Possible", calculate_oxygen_likelihood(planet))

    def test_gas_giant(self):
        planet = {'pl_bmasse': 50, 'pl_rade': 10}
        self.assertIn("Unlikely", calculate_oxygen_likelihood(planet))


class TestEnrichPlanet(unittest.TestCase):
    def test_enriches_fields(self):
        planet = {'pl_name': 'Test-1', 'pl_rade': '1.0', 'pl_bmasse': '1.0'}
        enriched = enrich_planet_data(planet)
        self.assertIn('esi', enriched)
        self.assertIn('water_status', enriched)
        self.assertIn('oxygen_likelihood', enriched)
        self.assertIn('earth_comparison', enriched)
        self.assertEqual(enriched['pl_name'], 'Test-1')


if __name__ == '__main__':
    unittest.main()
