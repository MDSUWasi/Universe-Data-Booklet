import urllib.request
import json
import ssl
import os
import csv
import io
import math
from datetime import datetime
from cache_manager import get_cached_data, save_to_cache

NASA_API_KEY = "DEMO_KEY"
BASE_URL = "https://api.nasa.gov"

# --- SCIENCE CALCULATORS ---

def calculate_earth_similarity(planet):
    """
    Calculates a simplified Earth Similarity Index (ESI) based on Radius and Mass.
    ESI = (1 - |R/R_earth - 1|)^(0.5) * (1 - |M/M_earth - 1|)^(0.5)
    Note: This is a simplified model for educational purposes.
    """
    try:
        r = float(planet.get('pl_rade', 1.0)) # Radius in Earth Radii
        m = float(planet.get('pl_bmasse', 1.0)) # Mass in Earth Masses
        
        r_score = 1 - abs(r - 1)
        m_score = 1 - abs(m - 1)
        
        # Clamp scores to 0-1
        r_score = max(0, min(1, r_score))
        m_score = max(0, min(1, m_score))
        
        esi = math.sqrt(r_score * m_score)
        return round(esi, 3)
    except:
        return 0.0

def calculate_water_probability(planet):
    """
    Estimates water presence based on Orbital Period and Radius.
    """
    try:
        period = float(planet.get('pl_orbper', 0))
        radius = float(planet.get('pl_rade', 0))
        
        # Habitable Zone Logic (Simplified)
        if 200 < period < 400:
            return "High (Likely Liquid)"
        elif period < 50:
            return "Low (Too Hot - Steam)"
        elif period > 1000:
            return "Low (Too Cold - Ice)"
        else:
            return "Moderate (Uncertain)"
    except:
        return "Unknown"

def calculate_oxygen_likelihood(planet):
    """
    Heuristic for Oxygen presence based on planet type (Super-Earth vs Gas Giant).
    """
    try:
        mass = float(planet.get('pl_bmasse', 0))
        radius = float(planet.get('pl_rade', 0))
        
        # If it's roughly Earth-sized and not too massive (gas giant)
        if 0.5 < mass < 5.0 and 0.8 < radius < 1.5:
            return "Possible (Terrestrial)"
        elif mass > 10:
            return "Unlikely (Gas/Ice Giant)"
        else:
            return "Unknown"
    except:
        return "Unknown"

def enrich_planet_data(planet):
    """Adds calculated science fields to the planet object."""
    planet['esi'] = calculate_earth_similarity(planet)
    planet['water_status'] = calculate_water_probability(planet)
    planet['oxygen_likelihood'] = calculate_oxygen_likelihood(planet)
    
    # Earth Comparison String
    r = float(planet.get('pl_rade', 1))
    m = float(planet.get('pl_bmasse', 1))
    if r > 1.5: size_comp = "Larger than Earth"
    elif r < 0.8: size_comp = "Smaller than Earth"
    else: size_comp = "Earth-sized"
    
    planet['earth_comparison'] = f"{size_comp} ({m}x Mass, {r}x Radius)"
    
    return planet

# --- FETCH FUNCTIONS ---

def fetch_asteroids(date=""):
    cached = get_cached_data('cached_asteroids.json')
    if cached:
        return cached, True

    try:
        if not date:
            date = datetime.now().strftime("%Y-%m-%d")
        url = f"{BASE_URL}/neo/rest/v1/feed?start_date={date}&end_date={date}&api_key={NASA_API_KEY}"
        context = ssl._create_unverified_context()
        
        print(f"🌍 Fetching asteroids for {date}...")
        with urllib.request.urlopen(url, context=context, timeout=15) as response:
            raw_data = json.loads(response.read().decode())
            neo_data = raw_data.get('near_earth_objects', {})
            save_to_cache('cached_asteroids.json', neo_data)
            return neo_data, False
    except Exception as e:
        print(f"❌ Asteroid Error: {e}")
        return {}, False

def fetch_exoplanets():
    cached = get_cached_data('cached_exoplanets.json')
    if cached:
        # Enrich cached data on the fly if needed, but usually cached is fine
        return cached, True

    csv_url = "https://exoplanetarchive.ipac.caltech.edu/cgi-bin/TblView/nph-tblView?access=CSV&table=pscompPSC&where=pl_discmethod='Transit'"
    
    try:
        context = ssl._create_unverified_context()
        req = urllib.request.Request(csv_url, headers={'User-Agent': 'Mozilla/5.0 (UniverseBooklet/1.0)'})
        
        print("🌍 Fetching exoplanets...")
        with urllib.request.urlopen(req, context=context, timeout=30) as response:
            csv_text = response.read().decode('utf-8')
            
            if csv_text.strip().startswith("<!DOCTYPE html>"):
                raise Exception("Received HTML instead of CSV")

            reader = csv.DictReader(io.StringIO(csv_text))
            planets = list(reader)
            
            # ENRICH DATA WITH SCIENCE METRICS
            enriched_planets = [enrich_planet_data(p) for p in planets]
            
            if len(enriched_planets) == 0:
                raise Exception("No planets found")

            print(f"✅ Parsed {len(enriched_planets)} exoplanets with science metrics.")
            save_to_cache('cached_exoplanets.json', enriched_planets)
            return enriched_planets, False

    except Exception as e:
        print(f"❌ Exoplanet Error: {e}")
        print("⚠️ Using Fallback Data.")
        
        # Fallback with pre-calculated metrics
        fallback = [
            {"pl_name": "Kepler-186f", "pl_orbper": "129.94", "pl_rade": "1.10", "pl_bmasse": "1.71", "hostname": "Kepler-186", "pl_discmethod": "Transit"},
            {"pl_name": "TRAPPIST-1e", "pl_orbper": "6.099", "pl_rade": "0.92", "pl_bmasse": "0.69", "hostname": "TRAPPIST-1", "pl_discmethod": "Transit"},
            {"pl_name": "Proxima Centauri b", "pl_orbper": "11.186", "pl_rade": "1.07", "pl_bmasse": "1.27", "hostname": "Proxima Centauri", "pl_discmethod": "Radial Velocity"},
            {"pl_name": "Kepler-452b", "pl_orbper": "384.84", "pl_rade": "1.63", "pl_bmasse": "5.0", "hostname": "Kepler-452", "pl_discmethod": "Transit"}
        ]
        enriched_fallback = [enrich_planet_data(p) for p in fallback]
        save_to_cache('cached_exoplanets.json', enriched_fallback)
        return enriched_fallback, False