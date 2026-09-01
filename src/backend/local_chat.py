import re
from typing import List, Dict, Any


def _normalize(value: str) -> str:
    if value is None:
        return ""
    text = str(value).lower().strip()
    text = re.sub(r"[^a-z0-9\s-]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _find_best_match(items: List[Dict[str, Any]], question: str, name_keys: List[str]) -> Dict[str, Any]:
    if not items:
        return {}

    normalized_question = _normalize(question)
    best_match = {}
    best_score = -1

    for item in items:
        searchable = " ".join(str(item.get(key, "")) for key in name_keys if item.get(key) is not None)
        search_text = _normalize(searchable)
        score = 0

        if search_text and search_text in normalized_question:
            score += 4
        if normalized_question and normalized_question in search_text:
            score += 5

        for token in normalized_question.split():
            if len(token) < 3:
                continue
            if token in search_text:
                score += 2

        if score > best_score:
            best_score = score
            best_match = item

    return best_match


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value in (None, "", "N/A"):
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def answer_question(question: str, asteroid_data: List[Dict[str, Any]] = None, exoplanet_data: List[Dict[str, Any]] = None) -> str:
    if not question or not question.strip():
        return "Please ask a question about the available asteroid or exoplanet data."

    asteroids = asteroid_data or []
    exoplanets = exoplanet_data or []
    q = _normalize(question)

    if not asteroids and not exoplanets:
        return "I couldn’t find any local data to answer that question yet."

    if "asteroid" in q or "asteroids" in q:
        if "largest" in q or "biggest" in q or "max" in q:
            if not asteroids:
                return "There are no asteroid records available in the local dataset."
            largest = max(asteroids, key=lambda item: _safe_float(item.get("diameter_km"), 0.0))
            return f"The largest asteroid in the local dataset is {largest.get('name', 'Unknown')} at {largest.get('diameter_km', 0)} km diameter."

        if "hazardous" in q or "dangerous" in q:
            count = sum(1 for item in asteroids if item.get("hazardous") is True)
            return f"There are {count} hazardous asteroid entries in the current local dataset."

        if "how many" in q and "asteroid" in q:
            return f"The local asteroid dataset contains {len(asteroids)} records."

        match = _find_best_match(asteroids, question, ["name"])
        if match:
            name = match.get("name", "Unknown")
            diameter = _safe_float(match.get("diameter_km"), 0.0)
            hazardous = match.get("hazardous") is True
            hazard_text = "hazardous" if hazardous else "not hazardous"
            return f"{name} is {diameter} km wide and is currently marked as {hazard_text}."

        return "I found asteroid data, but I couldn’t match that specific asteroid name. Try a name like Bennu or Ceres."

    if "exoplanet" in q or "planet" in q or "habitable" in q or "esi" in q:
        if "most habitable" in q or "habitable" in q and "which" in q:
            if not exoplanets:
                return "There are no exoplanet records available in the local dataset."
            candidate = max(exoplanets, key=lambda item: _safe_float(item.get("esi"), 0.0))
            return f"The most habitable exoplanet in the local dataset is {candidate.get('pl_name', 'Unknown')} with an ESI of {candidate.get('esi', 'N/A')}."

        if "how many" in q and "exoplanet" in q:
            return f"The local exoplanet dataset contains {len(exoplanets)} records."

        if "highest" in q and "esi" in q:
            if not exoplanets:
                return "No exoplanet ESI values are available locally."
            candidate = max(exoplanets, key=lambda item: _safe_float(item.get("esi"), 0.0))
            return f"The highest ESI value belongs to {candidate.get('pl_name', 'Unknown')} at {candidate.get('esi', 'N/A')}."

        match = _find_best_match(exoplanets, question, ["pl_name", "hostname"])
        if match:
            name = match.get("pl_name", "Unknown")
            esi = match.get("esi", "N/A")
            water = match.get("water_status", "Unknown")
            return f"{name} has an ESI of {esi} and a water status of {water}."

        return "I found exoplanet data, but I couldn’t match that exact planet name. Try names like Kepler-186 f or TRAPPIST-1 e."

    if "bennu" in q or "ceres" in q or "apophis" in q:
        asteroids_match = _find_best_match(asteroids, question, ["name"])
        if asteroids_match:
            name = asteroids_match.get("name", "Unknown")
            diameter = _safe_float(asteroids_match.get("diameter_km"), 0.0)
            hazard = asteroids_match.get("hazardous") is True
            return f"{name} is {diameter} km wide and is {'hazardous' if hazard else 'not hazardous'}."

    if "trappist" in q or "kepler" in q or "hd" in q:
        exoplanets_match = _find_best_match(exoplanets, question, ["pl_name"])
        if exoplanets_match:
            name = exoplanets_match.get("pl_name", "Unknown")
            esi = exoplanets_match.get("esi", "N/A")
            return f"{name} has an ESI of {esi}. It is part of the local exoplanet dataset."

    if "what is the largest" in q or "biggest" in q:
        if asteroids:
            largest = max(asteroids, key=lambda item: _safe_float(item.get("diameter_km"), 0.0))
            return f"The largest object in the asteroid dataset is {largest.get('name', 'Unknown')} at {largest.get('diameter_km', 0)} km."
        if exoplanets:
            candidate = max(exoplanets, key=lambda item: _safe_float(item.get("esi"), 0.0))
            return f"The highest-scoring exoplanet in the dataset is {candidate.get('pl_name', 'Unknown')} with ESI {candidate.get('esi', 'N/A')}."

    return (
        "I can answer local questions about asteroids and exoplanets in this project. "
        "Examples: 'Which exoplanet is most habitable?', 'How many hazardous asteroids?', or 'Tell me about Bennu'."
    )
