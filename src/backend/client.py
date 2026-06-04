import urllib.request
import json
import ssl
import os
from datetime import datetime
from cache_manager import get_cached_data, save_to_cache

# Public NASA Key (No signup, rate limited to 1 req/sec)
NASA_API_KEY = "DEMO_KEY"
BASE_URL = "https://api.nasa.gov"

def fetch_asteroids(date=""):
    """Fetches asteroids. Checks cache first to avoid rate limits."""
    cached = get_cached_data('cached_asteroids.json')
    if cached:
        return cached, True

    try:
        if not date:
            date = datetime.now().strftime("%Y-%m-%d")
        
        url = f"{BASE_URL}/neo/rest/v1/feed?start_date={date}&end_date={date}&api_key={NASA_API_KEY}"
        context = ssl._create_unverified_context()
        
        print(f"🌍 Fetching fresh asteroid data for {date}...")
        with urllib.request.urlopen(url, context=context, timeout=15) as response:
            raw_data = json.loads(response.read().decode())
            neo_data = raw_data.get('near_earth_objects', {})
            
            save_to_cache('cached_asteroids.json', neo_data)
            print("✅ Asteroids cached locally.")
            return neo_data, False
    except Exception as e:
        print(f"❌ NASA API Error: {e}")
        return {}, False

def fetch_exoplanets():
    """Fetches exoplanets from the public CSV archive."""
    cached = get_cached_data('cached_exoplanets.json')
    if cached:
        return cached, True

    try:
        # Public CSV URL (No API key needed)
        csv_url = "https://exoplanetarchive.ipac.caltech.edu/cgi-bin/TblView/nph-tblView?access=CSV&table=pscompPSC&where=pl_discmethod='Transit'"
        context = ssl._create_unverified_context()
        
        print("🌍 Fetching fresh exoplanet data...")
        with urllib.request.urlopen(csv_url, context=context, timeout=30) as response:
            csv_data = response.read().decode('utf-8')
            lines = csv_data.strip().split('\n')
            headers = lines[0].split(',')
            planets = []
            
            for line in lines[1:]:
                # Handle commas inside quotes if necessary, but simple split works for basic CSV
                values = line.split(',')
                if len(values) >= len(headers):
                    planet = {headers[i].strip(): values[i].strip() for i in range(len(headers))}
                    planets.append(planet)
            
            save_to_cache('cached_exoplanets.json', planets)
            print("✅ Exoplanets cached locally.")
            return planets, False
    except Exception as e:
        print(f"❌ Exoplanet API Error: {e}")
        return [], False