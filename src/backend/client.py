import urllib.request
import json
import ssl
import os
import csv
import io
from datetime import datetime
from cache_manager import get_cached_data, save_to_cache

NASA_API_KEY = "DEMO_KEY"
BASE_URL = "https://api.nasa.gov"

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
            print("✅ Asteroids cached.")
            return neo_data, False
    except Exception as e:
        print(f"❌ Asteroid Error: {e}")
        return {}, False

def fetch_exoplanets():
    cached = get_cached_data('cached_exoplanets.json')
    if cached:
        return cached, True

    # Try the official NASA Exoplanet Archive CSV
    csv_url = "https://exoplanetarchive.ipac.caltech.edu/cgi-bin/TblView/nph-tblView?access=CSV&table=pscompPSC&where=pl_discmethod='Transit'"
    
    try:
        context = ssl._create_unverified_context()
        req = urllib.request.Request(csv_url, headers={'User-Agent': 'Mozilla/5.0 (UniverseBooklet/1.0)'})
        
        print("🌍 Fetching exoplanets...")
        with urllib.request.urlopen(req, context=context, timeout=30) as response:
            # Read as text
            csv_text = response.read().decode('utf-8')
            
            # Check if we got an HTML error page instead of CSV
            if csv_text.strip().startswith("<!DOCTYPE html>") or csv_text.strip().startswith("<html"):
                print("❌ Received HTML instead of CSV. NASA might be blocking or the URL changed.")
                raise Exception("Invalid CSV format (HTML received)")

            # Use Python's csv module for robust parsing
            reader = csv.DictReader(io.StringIO(csv_text))
            planets = list(reader)
            
            if len(planets) == 0:
                raise Exception("No planets found in CSV")

            print(f"✅ Parsed {len(planets)} exoplanets.")
            save_to_cache('cached_exoplanets.json', planets)
            return planets, False

    except Exception as e:
        print(f"❌ Exoplanet Error: {e}")
        print("⚠️ Falling back to hardcoded demo data.")
        
        # Robust Fallback Data
        fallback_planets = [
            {"pl_name": "Kepler-186f", "pl_orbper": "129.94", "pl_rade": "1.10", "pl_bmasse": "1.71", "hostname": "Kepler-186", "pl_discmethod": "Transit"},
            {"pl_name": "TRAPPIST-1e", "pl_orbper": "6.099", "pl_rade": "0.92", "pl_bmasse": "0.69", "hostname": "TRAPPIST-1", "pl_discmethod": "Transit"},
            {"pl_name": "Proxima Centauri b", "pl_orbper": "11.186", "pl_rade": "1.07", "pl_bmasse": "1.27", "hostname": "Proxima Centauri", "pl_discmethod": "Radial Velocity"},
            {"pl_name": "Kepler-452b", "pl_orbper": "384.84", "pl_rade": "1.63", "pl_bmasse": "5.0", "hostname": "Kepler-452", "pl_discmethod": "Transit"},
            {"pl_name": "HD 40307 g", "pl_orbper": "197.8", "pl_rade": "2.2", "pl_bmasse": "7.0", "hostname": "HD 40307", "pl_discmethod": "Radial Velocity"},
            {"pl_name": "Gliese 667 Cc", "pl_orbper": "28.15", "pl_rade": "1.54", "pl_bmasse": "3.8", "hostname": "Gliese 667 C", "pl_discmethod": "Radial Velocity"},
            {"pl_name": "Wolf 1061c", "pl_orbper": "17.87", "pl_rade": "1.6", "pl_bmasse": "4.3", "hostname": "Wolf 1061", "pl_discmethod": "Radial Velocity"},
            {"pl_name": "Teegarden's Star b", "pl_orbper": "4.9", "pl_rade": "1.02", "pl_bmasse": "1.05", "hostname": "Teegarden's Star", "pl_discmethod": "Radial Velocity"},
            {"pl_name": "LHS 1140 b", "pl_orbper": "24.7", "pl_rade": "1.4", "pl_bmasse": "6.6", "hostname": "LHS 1140", "pl_discmethod": "Transit"},
            {"pl_name": "K2-18b", "pl_orbper": "32.9", "pl_rade": "2.6", "pl_bmasse": "8.6", "hostname": "K2-18", "pl_discmethod": "Transit"}
        ]
        
        save_to_cache('cached_exoplanets.json', fallback_planets)
        return fallback_planets, False