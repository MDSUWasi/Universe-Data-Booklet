#!/usr/bin/env python3
import os, sys, json, csv, io, ssl, urllib.request, time, re
from datetime import datetime, timedelta
from pathlib import Path

# Add parent to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DATA_DIR = Path(__file__).parent.parent / "data"
CACHE_DAYS = 14
NASA_API_KEY = "DEMO_KEY"

def ensure_dir(): DATA_DIR.mkdir(parents=True, exist_ok=True)

def cleanup_old():
    print("🧹 Cleaning cache > 14 days...")
    now = time.time()
    for f in DATA_DIR.glob("*.json"):
        if now - os.path.getmtime(f) > CACHE_DAYS * 86400:
            os.remove(f); print(f"   Deleted: {f.name}")

def calc_esi(p):
    try:
        r, m = float(p.get('pl_rade', 1)), float(p.get('pl_bmasse', 1))
        return round(((max(0, min(1, 1-abs(r-1))) * max(0, min(1, 1-abs(m-1))))**0.5), 3)
    except: return 0.0

def fetch_asteroids():
    print("🌍 Fetching Asteroids (Last 90 Days)...")
    end = datetime.now().strftime("%Y-%m-%d")
    start = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
    url = f"https://api.nasa.gov/neo/rest/v1/feed?start_date={start}&end_date={end}&api_key={NASA_API_KEY}"
    
    try:
        ctx = ssl._create_unverified_context()
        with urllib.request.urlopen(url, context=ctx, timeout=30) as res:
            raw = json.loads(res.read().decode())
            data = []
            for day, objs in raw.get('near_earth_objects', {}).items():
                for o in objs:
                    d = o.get('estimated_diameter',{}).get('meters',{}).get('estimated_diameter_min', 0)
                    v = o.get('close_approach_data',[{}])[0].get('relative_velocity',{}).get('kilometers_per_hour', 0)
                    data.append({
                        "id": str(o['id']), "name": o['name'], "date": day,
                        "diameter_km": round(d/1000, 2), "velocity_kmh": round(float(v), 2),
                        "hazardous": o['is_potentially_hazardous_asteroid']
                    })
            with open(DATA_DIR/"asteroids.json", 'w') as f: json.dump(data, f)
            print(f"✅ Saved {len(data)} asteroids.")
    except Exception as e: print(f"❌ Error: {e}")

def fetch_exoplanets():
    print("🌍 Fetching FULL Exoplanet Archive...")
    # Fixed: Removed 'where' filter, added 'confirms=confirmed'
    url = "https://exoplanetarchive.ipac.caltech.edu/cgi-bin/TblView/nph-tblView?access=CSV&table=pscompPSC&confirms=confirmed"
    
    try:
        ctx = ssl._create_unverified_context()
        req = urllib.request.Request(url, headers={'User-Agent': 'UniverseBooklet/2.0'})
        with urllib.request.urlopen(req, context=ctx, timeout=180) as res:
            reader = csv.DictReader(io.StringIO(res.read().decode()))
            planets = []
            for row in reader:
                if not row.get('pl_name'): continue
                p = dict(row)
                p['esi'] = calc_esi(p)
                try:
                    per = float(p.get('pl_orbper', 0))
                    p['status'] = "High (Habitable)" if 200<per<400 else "Hot" if per<50 else "Cold" if per>1000 else "Moderate"
                except: p['status'] = "Unknown"
                planets.append(p)
            with open(DATA_DIR/"exoplanets.json", 'w') as f: json.dump(planets, f)
            print(f"✅ Saved {len(planets)} exoplanets.")
    except Exception as e: print(f"❌ Error: {e}")

if __name__ == "__main__":
    ensure_dir(); cleanup_old(); fetch_asteroids(); fetch_exoplanets()