# src/backend/client.py
import urllib.request
import json
import ssl
import os
import math
import re
from datetime import datetime, timedelta
import csv
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from cache_manager import get_cached_data, save_to_cache

# --- CONFIGURATION ---
NASA_API_KEY = "DEMO_KEY" 
BASE_URL = "https://api.nasa.gov"
CACHE_DAYS = 7  

# --- CORRECT PATH CALCULATION FOR YOUR STRUCTURE ---
# Script is at: /project/src/backend/client.py
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))       
# Go UP ONE level: /project/src (This is where 'data' and 'frontend' are)
SRC_DIR = os.path.dirname(SCRIPT_DIR)                         

# Now 'data' is directly inside SRC_DIR
DATA_DIR = os.path.join(SRC_DIR, 'data')
CSV_PATH = os.path.join(DATA_DIR, 'exoplanets.csv')
JSON_PATH = os.path.join(DATA_DIR, 'exoplanets.json')

print("\n" + "="*60)
print(f"📍 SCRIPT: {SCRIPT_DIR}")
print(f"🏠 SRC DIR: {SRC_DIR}")
print(f"📂 DATA DIR: {DATA_DIR}")
print(f"📄 CSV PATH: {CSV_PATH}")
print(f"✅ CSV EXISTS: {os.path.exists(CSV_PATH)}")
if os.path.exists(DATA_DIR):
    print(f"📝 FILES IN DATA: {os.listdir(DATA_DIR)}")
else:
    print("❌ ERROR: Data directory NOT FOUND!")
print("="*60 + "\n")

def sanitize_input(text):
    if not text: return ""
    cleaned = re.sub(r'[^\w\s\-\.]', '', str(text))
    return cleaned.strip()[:100]

def safe_float(value, default=1.0):
    if not value or value == '' or value is None:
        return default
    try:
        val = str(value).strip()
        return float(val) if val else default
    except ValueError:
        return default

def calculate_earth_similarity(planet):
    try:
        r = safe_float(planet.get('pl_rade'), 1.0)
        m = safe_float(planet.get('pl_bmasse'), 1.0)
        r_score = max(0, min(1, 1 - abs(r - 1)))
        m_score = max(0, min(1, 1 - abs(m - 1)))
        return round(math.sqrt(r_score * m_score), 3)
    except Exception:
        return 0.0

def calculate_water_probability(planet):
    try:
        period = safe_float(planet.get('pl_orbper'), 0)
        if 200 < period < 400: return "High (Likely Liquid)"
        elif period < 50: return "Low (Too Hot - Steam)"
        elif period > 1000: return "Low (Too Cold - Ice)"
        else: return "Moderate (Uncertain)"
    except: return "Unknown"

def calculate_oxygen_likelihood(planet):
    try:
        mass = safe_float(planet.get('pl_bmasse'), 0)
        radius = safe_float(planet.get('pl_rade'), 0)
        if 0.5 < mass < 5.0 and 0.8 < radius < 1.5: return "Possible (Terrestrial)"
        elif mass > 10: return "Unlikely (Gas/Ice Giant)"
        return "Unknown"
    except: return "Unknown"

def enrich_planet_data(planet):
    planet['esi'] = calculate_earth_similarity(planet)
    planet['water_status'] = calculate_water_probability(planet)
    planet['oxygen_likelihood'] = calculate_oxygen_likelihood(planet)
    
    r = safe_float(planet.get('pl_rade'), 1)
    m = safe_float(planet.get('pl_bmasse'), 1)
    
    size_comp = "Earth-sized"
    if r > 1.5: size_comp = "Larger than Earth"
    elif r < 0.8: size_comp = "Smaller than Earth"
    
    planet['earth_comparison'] = f"{size_comp} ({m}x Mass, {r}x Radius)"
    planet['pl_name'] = sanitize_input(planet.get('pl_name', ''))
    planet['hostname'] = sanitize_input(planet.get('hostname', ''))
    return planet

def load_exoplanets_from_csv():
    if not os.path.isfile(CSV_PATH):
        print(f"❌ [FATAL] FILE NOT FOUND: {CSV_PATH}")
        if os.path.exists(DATA_DIR):
            files = [f for f in os.listdir(DATA_DIR)]
            print(f"💡 Found files: {files}")
        return None, False
    
    print(f"📁 Reading CSV: {CSV_PATH}...")
    try:
        planets = []
        with open(CSV_PATH, 'r', encoding='utf-8-sig', errors='ignore') as f:
            reader = csv.DictReader(f)
            
            if not reader.fieldnames:
                print("❌ CSV empty or no headers.")
                return None, False
            
            for row in reader:
                p_name = row.get('pl_name') or row.get('name')
                if not p_name: continue
                
                p = {
                    'pl_name': p_name,
                    'hostname': row.get('pl_hostname') or row.get('primary') or 'Unknown',
                    'pl_orbper': row.get('pl_orbper', ''),
                    'pl_rade': row.get('pl_rade', ''),
                    'pl_bmasse': row.get('pl_bmasse', ''),
                    'pl_discmethod': row.get('pl_discmethod', 'Unknown')
                }
                
                enriched = enrich_planet_data(p)
                planets.append(enriched)
                if len(planets) >= 6000: break
            
            if len(planets) == 0:
                print("❌ No planets extracted.")
                return None, False

            with open(JSON_PATH, 'w', encoding='utf-8') as jf:
                json.dump(planets, jf, indent=2)
            
            print(f"✅ SUCCESS! Loaded {len(planets)} exoplanets.")
            return planets, False

    except Exception as e:
        print(f"❌ Error reading CSV: {e}")
        import traceback
        traceback.print_exc()
        return None, False

def fetch_asteroids():
    cached = get_cached_data('cached_asteroids.json')
    if cached:
        return cached, True

    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    url = f"{BASE_URL}/neo/rest/v1/feed?start_date={start_date}&end_date={end_date}&api_key={NASA_API_KEY}"
    
    try:
        context = ssl._create_unverified_context()
        req = urllib.request.Request(url, headers={'User-Agent': 'UniverseBooklet/3.0'})
        with urllib.request.urlopen(req, context=context, timeout=30) as response:
            raw_data = json.loads(response.read().decode())
            neo_data = raw_data.get('near_earth_objects', {})
            flat_list = []
            for day, objects in neo_data.items():
                for obj in objects:
                    try:
                        diam_min = obj['estimated_diameter']['meters']['estimated_diameter_min']
                        vel = obj['close_approach_data'][0]['relative_velocity']['kilometers_per_hour']
                    except KeyError:
                        diam_min, vel = 0, 0
                    flat_list.append({
                        "id": str(obj['id']), "name": sanitize_input(obj['name']), "date": day,
                        "diameter_km": round(float(diam_min)/1000, 2), "velocity_kmh": round(float(vel), 2),
                        "hazardous": obj.get('is_potentially_hazardous_asteroid', False)
                    })
            if len(flat_list) == 0: raise Exception("Empty")
            save_to_cache('cached_asteroids.json', flat_list)
            return flat_list, False
    except Exception as e:
        print(f"❌ Asteroid Error: {e}")
        return [{"id": "1", "name": "Ceres", "date": datetime.now().strftime("%Y-%m-%d"), "diameter_km": 940.0, "velocity_kmh": 18000, "hazardous": False}], False

def fetch_exoplanets():
    data, _ = load_exoplanets_from_csv()
    if data and len(data) > 10:
        return data, False
    print("⚠️ No exoplanet data loaded.")
    return [], False