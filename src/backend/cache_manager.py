# src/backend/cache_manager.py
import json
import os
import time
from datetime import datetime
import threading

# Paths relative to this file's location inside src/backend
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_DIR = os.path.join(BASE_DIR, '..', '..', 'data')

# Fixed: Align with server.py MAX_CACHE_AGE_DAYS = 90 days
CACHE_DURATION_SECONDS = 7 * 24 * 60 * 60      # 7 Days (for checking freshness on read)
CLEANUP_THRESHOLD = 90 * 24 * 60 * 60          # 90 Days (matches server.py retention)

# Thread lock for coordinating with server.py cache refresh operations
_cache_lock = threading.Lock()


def ensure_cache_dir():
    try:
        if not os.path.exists(CACHE_DIR):
            os.makedirs(CACHE_DIR, exist_ok=True)
    except PermissionError:
        print(f"⚠️ Permission denied creating cache dir: {CACHE_DIR}")
    except Exception as e:
        print(f"⚠️ Cache directory creation error: {type(e).__name__}")


def cleanup_old_cache():
    """Fixed: Deletes files older than CLEANUP_THRESHOLD (now 90 days to match server)."""
    ensure_cache_dir()
    current_time = time.time()
    deleted_count = 0
    
    try:
        for filename in os.listdir(CACHE_DIR):
            if filename.endswith('.json'):
                filepath = os.path.join(CACHE_DIR, filename)
                try:
                    mod_time = os.path.getmtime(filepath)
                    if current_time - mod_time > CLEANUP_THRESHOLD:
                        os.remove(filepath)
                        deleted_count += 1
                        print(f"🗑️ Cleaned old cache: {filename}")
                except FileNotFoundError:
                    continue  # File was removed by another process
                except PermissionError:
                    pass  # Skip files we can't access
                except Exception as e:
                    print(f"⚠️ Cleanup error for {filename}: {type(e).__name__}")
                    
    except PermissionError:
        pass
    except Exception as e:
        print(f"⚠️ Cache cleanup error: {type(e).__name__}")

    return deleted_count


def load_from_cache(filename):
    """Loads data if fresh (< 7 days). Returns None if expired or missing."""
    ensure_cache_dir()
    filepath = os.path.join(CACHE_DIR, filename)
    
    if not os.path.exists(filepath):
        return None
    
    try:
        statinfo = os.stat(filepath)
        age_seconds = time.time() - statinfo.st_mtime
        
        if age_seconds > CACHE_DURATION_SECONDS:
            return None  # Expired
            
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('payload')
            
    except json.JSONDecodeError:
        print(f"⚠️ Invalid JSON in cache: {filename}")
        return None
    except IOError:
        print(f"⚠️ Cannot read cache file: {filename}")
        return None
    except KeyError:
        print(f"⚠️ Missing payload key in cache: {filename}")
        return None
    except Exception as e:
        print(f"⚠️ Unexpected cache load error: {type(e).__name__}")
        return None


def save_to_cache(filename, payload):
    """Saves data with timestamp. Fixed: Uses atomic temp file + replace."""
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
        
        # Atomic replace ensures partial writes don't corrupt existing cache
        os.replace(temp_path, filepath)
        
    except PermissionError:
        print(f"⚠️ Permission denied saving cache: {filename}")
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise
    except Exception as e:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass
        print(f"⚠️ Failed to save cache: {type(e).__name__}")
        raise e


def get_cached_data(filename):
    """Wrapper for load_from_cache with thread-safe coordination."""
    with _cache_lock:
        return load_from_cache(filename)