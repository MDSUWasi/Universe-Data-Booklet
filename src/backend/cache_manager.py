import json
import os
import time
from datetime import datetime

# Paths relative to this file
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(BASE_DIR, '..', '..', 'data')
CACHE_DURATION = 3600  # 1 Hour

def ensure_cache_dir():
    if not os.path.exists(CACHE_DIR):
        os.makedirs(CACHE_DIR)

def load_from_cache(filename):
    """Loads data if it exists and is fresh (< 1 hour)."""
    ensure_cache_dir()
    filepath = os.path.join(CACHE_DIR, filename)
    
    if not os.path.exists(filepath):
        return None
    
    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
            if 'timestamp' in data and (time.time() - data['timestamp']) < CACHE_DURATION:
                return data.get('payload')
            return None # Expired
    except Exception:
        return None

def save_to_cache(filename, payload):
    """Saves data with a timestamp."""
    ensure_cache_dir()
    filepath = os.path.join(CACHE_DIR, filename)
    data = {
        'timestamp': time.time(),
        'payload': payload,
        'fetched_at': datetime.now().isoformat()
    }
    with open(filepath, 'w') as f:
        json.dump(data, f)

def get_cached_data(filename):
    return load_from_cache(filename)