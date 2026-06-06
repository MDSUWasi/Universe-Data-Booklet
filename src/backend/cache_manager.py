# src/backend/cache_manager.py
import json
import os
import time
from datetime import datetime

# Paths relative to this file's location inside src/backend
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(BASE_DIR, '..', '..', 'data')
CACHE_DURATION_SECONDS = 7 * 24 * 60 * 60 # 7 Days
CLEANUP_THRESHOLD = 14 * 24 * 60 * 60     # 14 Days

def ensure_cache_dir():
    try:
        if not os.path.exists(CACHE_DIR):
            os.makedirs(CACHE_DIR, exist_ok=True)
    except PermissionError:
        print(f"⚠️ Permission denied creating cache dir: {CACHE_DIR}")

def cleanup_old_cache():
    """Deletes files older than CLEANUP_THRESHOLD."""
    ensure_cache_dir()
    current_time = time.time()
    deleted_count = 0
    
    try:
        for filename in os.listdir(CACHE_DIR):
            if filename.endswith('.json'):
                filepath = os.path.join(CACHE_DIR, filename)
                mod_time = os.path.getmtime(filepath)
                if current_time - mod_time > CLEANUP_THRESHOLD:
                    os.remove(filepath)
                    deleted_count += 1
                    print(f"🗑️ Cleaned old cache: {filename}")
    except PermissionError:
        pass
    except Exception as e:
        print(f"⚠️ Cache cleanup error: {e}")

    return deleted_count

def load_from_cache(filename):
    """Loads data if fresh (< 7 days)."""
    ensure_cache_dir()
    filepath = os.path.join(CACHE_DIR, filename)
    
    if not os.path.exists(filepath):
        return None
    
    try:
        statinfo = os.stat(filepath)
        age_seconds = time.time() - statinfo.st_mtime
        
        if age_seconds > CACHE_DURATION_SECONDS:
            return None # Expired
            
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('payload')
            
    except (json.JSONDecodeError, IOError, KeyError):
        return None

def save_to_cache(filename, payload):
    """Saves data with timestamp."""
    ensure_cache_dir()
    filepath = os.path.join(CACHE_DIR, filename)
    data = {
        'timestamp': time.time(),
        'payload': payload,
        'fetched_at': datetime.now().isoformat()
    }
    temp_path = filepath + '.tmp'
    try:
        with open(temp_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        os.replace(temp_path, filepath)
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        print(f"⚠️ Failed to save cache: {e}")
        raise e

def get_cached_data(filename):
    return load_from_cache(filename)