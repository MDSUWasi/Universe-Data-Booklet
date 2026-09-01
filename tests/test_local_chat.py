import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src', 'backend'))

from local_chat import answer_question


ASTEROIDS = [
    {"name": "Bennu", "diameter_km": 0.49, "hazardous": True},
    {"name": "Ceres", "diameter_km": 939.4, "hazardous": False},
    {"name": "Apophis", "diameter_km": 0.34, "hazardous": True},
]

EXOPLANETS = [
    {"pl_name": "Kepler-186 f", "esi": 0.88, "water_status": "High (Likely Liquid)", "hostname": "Kepler-186"},
    {"pl_name": "TRAPPIST-1 e", "esi": 0.91, "water_status": "High (Likely Liquid)", "hostname": "TRAPPIST-1"},
    {"pl_name": "HD 40307 g", "esi": 0.56, "water_status": "Moderate (Uncertain)", "hostname": "HD 40307"},
]


def test_astroid_largest_question():
    answer = answer_question("What is the largest asteroid?", ASTEROIDS, EXOPLANETS)
    assert "Ceres" in answer
    assert "939" in answer


def test_most_habitable_exoplanet_question():
    answer = answer_question("Which exoplanet is most habitable?", ASTEROIDS, EXOPLANETS)
    assert "TRAPPIST-1 e" in answer
    assert "0.91" in answer


def test_hazardous_asteroid_count_question():
    answer = answer_question("How many hazardous asteroids are in the dataset?", ASTEROIDS, EXOPLANETS)
    assert "2" in answer


def test_name_lookup_question():
    answer = answer_question("Tell me about Bennu", ASTEROIDS, EXOPLANETS)
    assert "Bennu" in answer
    assert "hazardous" in answer.lower()
