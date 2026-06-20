# src/backend/server.py
import http.server
import socketserver
import json
import os
import sys
from urllib.parse import urlparse, parse_qs
import re
import time
import threading
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from client import fetch_asteroids, fetch_exoplanets
from cache_manager import cleanup_old_cache

PORT = int(os.getenv("SERVER_PORT", 8081))
# Production Check: Set DEBUG=false in env to hide stack traces completely
DEBUG_MODE = os.getenv("DEBUG_MODE", "true").lower() == "true"

SERVER_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.dirname(SERVER_SCRIPT_DIR)

FRONTEND_DIR = os.path.join(SRC_DIR, 'frontend')
DATA_DIR = os.path.join(SRC_DIR, 'data')

REFRESH_THRESHOLD_DAYS = 30
MAX_CACHE_AGE_DAYS = 90
CACHE_FILE = os.path.join(DATA_DIR, 'cached_asteroids.json')

# Cache refresh lock to prevent race conditions
_refresh_lock = threading.Lock()

print(f"\n🚀 SERVER STARTING")
print(f"   Frontend: {FRONTEND_DIR} ({os.path.exists(FRONTEND_DIR)})")
print(f"   Data:     {DATA_DIR} ({os.path.exists(DATA_DIR)})")
print(f"   Mode:     {'PRODUCTION' if not DEBUG_MODE else 'DEBUG'}")

if DEBUG_MODE:
    print("⚠️ WARNING: Running in DEBUG MODE. Set DEBUG_MODE=false in environment for production.")

if not os.path.exists(DATA_DIR):
    print("❌ ERROR: Data directory does not exist. Please create it before starting.")
    sys.exit(1)


class ThreadedHTTPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    """Handle requests in separate threads for concurrency."""
    allow_reuse_address = True
    daemon_threads = True


class SecureHandler(http.server.SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    
    def list_directory(self, path):
        self.send_error(403, "Forbidden")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def end_headers(self):
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('X-XSS-Protection', '1; mode=block')
        self.send_header('X-Content-Type-Options', 'nosniff')
        
        # --- PRODUCTION CORS FIX ---
        origin = self.headers.get('Origin')
        allowed_origins = ['http://localhost:3000', 'http://localhost:8080', 'null'] 
        
        if origin:
            if origin in allowed_origins:
                self.send_header('Access-Control-Allow-Origin', origin)
            else:
                # SECURITY: Do NOT send wildcard (*) if unauthorized Origin is present
                pass 
        else:
            # No Origin = direct browser access (e.g., typing URL) -> Safe to allow all
            self.send_header('Access-Control-Allow-Origin', '*') 

        self.send_header('Cache-Control', 'max-age=3600, must-revalidate') 
        self.send_header('Referrer-Policy', 'no-referrer')
        super().end_headers()

    def translate_path(self, path):
        """Fixed: Use realpath on BOTH paths to prevent symlink bypass attacks."""
        translated = super().translate_path(path)
        real_frontend = os.path.realpath(FRONTEND_DIR)
        real_translated = os.path.realpath(translated)
        
        # Prevent directory traversal even with symlinks
        if not (real_translated.startswith(real_frontend + os.sep) or real_translated == real_frontend):
            self.send_error(403, "Forbidden: Access denied.")
            return None
        return translated

    def check_and_refresh_asteroids(self):
        """Fixed: Added thread lock to prevent concurrent cache writes."""
        now = time.time()
        with _refresh_lock:
            if os.path.exists(CACHE_FILE):
                age_days = (now - os.stat(CACHE_FILE).st_mtime) / 86400
                if age_days > REFRESH_THRESHOLD_DAYS:
                    try:
                        new_data, _ = fetch_asteroids()
                        if new_data:
                            temp_file = CACHE_FILE + '.tmp'
                            with open(temp_file, 'w', encoding='utf-8') as f:
                                json.dump({'timestamp': time.time(), 'payload': new_data}, f)
                            os.replace(temp_file, CACHE_FILE)
                            print(f"✅ Refreshed asteroids ({len(new_data)})")
                    except Exception as e:
                        # Log locally, don't expose details to clients
                        print(f"⚠️ Cache refresh failed: {type(e).__name__}")
                        # Keep serving stale data instead of failing
            else:
                try:
                    new_data, _ = fetch_asteroids()
                    if new_data:
                        temp_file = CACHE_FILE + '.tmp'
                        with open(temp_file, 'w', encoding='utf-8') as f:
                            json.dump({'timestamp': time.time(), 'payload': new_data}, f)
                        os.replace(temp_file, CACHE_FILE)
                except Exception as e:
                    print(f"⚠️ Initial fetch failed: {type(e).__name__}")
            
            if os.path.exists(DATA_DIR):
                try:
                    for f in os.listdir(DATA_DIR):
                        fp = os.path.join(DATA_DIR, f)
                        if os.path.isfile(fp) and f.endswith('.json'):
                            if (time.time() - os.stat(fp).st_mtime) / 86400 > MAX_CACHE_AGE_DAYS:
                                os.remove(fp)
                                print(f"🗑️ Deleted old cache: {f}")
                except PermissionError:
                    pass
                except Exception as e:
                    print(f"⚠️ Cleanup error: {type(e).__name__}")
        return False

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        
        # Fixed: Also block encoded traversals (%2e%2e)
        if '..' in path or '%2e' in path.lower():
            self.send_error_json(400, "Invalid path")
            return

        if path == '/api/asteroids':
            self.check_and_refresh_asteroids()
            data = []
            if os.path.exists(CACHE_FILE):
                try:
                    with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                        content = json.load(f)
                        data = content.get('payload', [])
                except (json.JSONDecodeError, IOError, KeyError):
                    data = []
            
            # Pagination support
            query = parse_qs(parsed.query)
            page = int(query.get('page', [1])[0])
            limit = min(int(query.get('limit', [50])[0]), 100)  # Cap at 100 items/page
            
            start = max(0, (page - 1) * limit)
            end = start + limit
            paginated_data = data[start:end] if start < len(data) else []

            self.send_json_response(200, {
                "source": "NASA Cached", 
                "count": len(paginated_data),  # Fixed: Return current page count
                "total_count": len(data),      # Added: Total available items
                "page": page,
                "total_pages": max(1, (len(data) + limit - 1) // limit) if data else 1,
                "data": paginated_data
            })
            return

        if path == '/api/exoplanets':
            try:
                full_data, _ = fetch_exoplanets()
                if not isinstance(full_data, list): 
                    full_data = []
                
                # --- PAGINATION LOGIC ---
                query = parse_qs(parsed.query)
                page = int(query.get('page', [1])[0])
                limit = min(int(query.get('limit', [50])[0]), 100)  # Cap at 100
                
                start = max(0, (page - 1) * limit)
                end = start + limit
                paginated_data = full_data[start:end] if start < len(full_data) else []

                total_pages = max(1, (len(full_data) + limit - 1) // limit) if full_data else 1
                print(f"📊 Sending chunk {page}/{total_pages} ({len(paginated_data)} items)")
                self.send_json_response(200, {
                    "source": "Local CSV", 
                    "count": len(paginated_data),
                    "total_count": len(full_data),
                    "page": page,
                    "total_pages": total_pages,
                    "data": paginated_data
                })
            except Exception as e:
                print(f"⚠️ Exoplanet fetch error: {type(e).__name__}")
                self.send_error_json(500, "Internal Server Error: Exoplanet data unavailable")
            return

        if path == '/api/habitability':
            query = parse_qs(parsed.query)
            name_list = query.get('name', [])
            if not name_list or not name_list[0]:
                self.send_error_json(400, "Missing 'name' parameter")
                return

            raw_name = name_list[0]
            safe_name = re.sub(r'[^\w\-]', '', raw_name)[:80].strip()
            
            if not safe_name:
                self.send_error_json(400, "Invalid name format")
                return

            try:
                data, _ = fetch_exoplanets()
                if not isinstance(data, list): 
                    data = []
                # Normalize stored planet names to match the sanitized query
                planet = next((p for p in data if re.sub(r'[^\w\-]', '', p.get('pl_name', '')).lower() == safe_name.lower()), None)
                
                if not planet:
                    self.send_json_response(200, {"error": "Planet not found"})
                    return
                
                period = safe_float_from_planet(planet, 'pl_orbper', 0)
                status = "High" if 200 < period < 400 else "Hot" if period < 50 else "Cold" if period > 1000 else "Unknown"
                
                self.send_json_response(200, {
                    "planet": sanitize_output(planet.get('pl_name')),
                    "period_days": period,
                    "status": status
                })
            except Exception as e:
                print(f"⚠️ Habitability calculation error: {type(e).__name__}")
                self.send_error_json(500, "Internal Server Error: Calculation failed")
            return

        return super().do_GET()

    def send_json_response(self, code, data):
        try:
            body = json.dumps(data, default=str).encode('utf-8')
            self.send_response(code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', len(body))
            self.end_headers()
            self.wfile.write(body)
        except Exception:
            pass 

    def send_error_json(self, code, message):
        # NEVER expose detailed errors in production
        if DEBUG_MODE:
            safe_msg = str(message)[:200] if message else "Unknown Error"
        else:
            safe_msg = "Internal Server Error"  # Hide all details from clients
        
        body = json.dumps({"error": safe_msg}).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(body))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        # Reduced logging to console
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] {format % args}")


def safe_float_from_planet(planet, key, default):
    val = planet.get(key)
    if not val or val == '' or val is None: 
        return default
    try:
        return float(str(val).strip())
    except ValueError:
        return default

def sanitize_output(text):
    if not text: 
        return ""
    cleaned = re.sub(r'[^\w\s\-\.]', '', str(text))
    return cleaned.strip()[:100]


if __name__ == '__main__':
    if not os.path.exists(FRONTEND_DIR):
        print(f"❌ ERROR: Frontend missing at {FRONTEND_DIR}")
        sys.exit(1)

    # Verify data directory is writable
    if not os.access(DATA_DIR, os.W_OK):
        print(f"❌ ERROR: Data directory not writable at {DATA_DIR}")
        print("💡 This will cause cache failures. Fix permissions before deploying.")

    cleanup_old_cache()
    
    print(f"\n🚀 SERVER STARTING ON http://localhost:{PORT}")
    print(f"   Serving: {FRONTEND_DIR}")
    print(f"   Data Directory: {DATA_DIR}")
    print(f"   Threading: Enabled (concurrent requests supported)")
    print(f"   Demo API Key: Using NASA public key (rate limits apply)")
    print("")
    
    try:
        with ThreadedHTTPServer(("", PORT), SecureHandler) as httpd:
            print("✅ Server is secure and running.")
            print("Press Ctrl+C to stop.\n")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Stopped by user.")
    except OSError as e:
        if e.errno == 98: 
            print(f"\n❌ Port {PORT} is already in use.")
            print("💡 Tip: export SERVER_PORT=8082 && python src/backend/server.py")
        else: 
            raise