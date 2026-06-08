# src/backend/server.py
import http.server
import socketserver
import json
import os
import sys
from urllib.parse import urlparse, parse_qs
import re
import time
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

print(f"\n🚀 SERVER STARTING")
print(f"   Frontend: {FRONTEND_DIR} ({os.path.exists(FRONTEND_DIR)})")
print(f"   Data:     {DATA_DIR} ({os.path.exists(DATA_DIR)})")
print(f"   Mode:     {'DEBUG' if DEBUG_MODE else 'PRODUCTION'}")

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
        # Add your actual production domain here when deployed
        allowed_origins = ['http://localhost:3000', 'http://localhost:8080', 'null'] 
        
        if origin:
            if origin in allowed_origins:
                self.send_header('Access-Control-Allow-Origin', origin)
                # If needed, allow credentials (cookies/auth) - usually not needed for this app
                # self.send_header('Access-Control-Allow-Credentials', 'true') 
            else:
                # SECURITY: Do NOT send wildcard (*) if an unauthorized Origin is present
                # Just don't send the header or return an error if strict
                pass 
        else:
            # No Origin = direct browser access (e.g., typing URL) -> Safe to allow all
            self.send_header('Access-Control-Allow-Origin', '*') 

        self.send_header('Cache-Control', 'max-age=3600, must-revalidate') 
        self.send_header('Referrer-Policy', 'no-referrer')
        super().end_headers()

    def translate_path(self, path):
        translated = super().translate_path(path)
        real_frontend = os.path.realpath(FRONTEND_DIR)
        
        if not translated.startswith(real_frontend):
            self.send_error(403, "Forbidden: Access denied.")
            return None
        return translated

    def check_and_refresh_asteroids(self):
        now = time.time()
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
                    print(f"⚠️ Cache refresh failed: {e}")
            else:
                print(f"ℹ️ Cache fresh ({age_days:.1f} days)")
        else:
            try:
                new_data, _ = fetch_asteroids()
                if new_data:
                    temp_file = CACHE_FILE + '.tmp'
                    with open(temp_file, 'w', encoding='utf-8') as f:
                        json.dump({'timestamp': time.time(), 'payload': new_data}, f)
                    os.replace(temp_file, CACHE_FILE)
            except Exception as e:
                print(f"⚠️ Initial fetch failed: {e}")
        
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
                print(f"⚠️ Cleanup error: {e}")
        return False

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        
        if '..' in path:
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
                except (json.JSONDecodeError, IOError):
                    data = []
            
            # Pagination support (optional for asteroids too)
            query = parse_qs(parsed.query)
            page = int(query.get('page', [1])[0])
            limit = int(query.get('limit', [50])[0])
            
            start = (page - 1) * limit
            end = start + limit
            paginated_data = data[start:end] if start < len(data) else []

            self.send_json_response(200, {
                "source": "NASA Cached", 
                "count": len(data), 
                "page": page,
                "total_pages": (len(data) + limit - 1) // limit,
                "data": paginated_data
            })
            return

        if path == '/api/exoplanets':
            try:
                full_data, _ = fetch_exoplanets()
                if not isinstance(full_data, list): full_data = []
                
                # --- PAGINATION LOGIC ---
                query = parse_qs(parsed.query)
                page = int(query.get('page', [1])[0])
                limit = int(query.get('limit', [50])[0])
                
                start = (page - 1) * limit
                end = start + limit
                paginated_data = full_data[start:end] if start < len(full_data) else []

                print(f"📊 Sending chunk {page}/{(len(full_data)+limit-1)//limit} ({len(paginated_data)} items)")
                self.send_json_response(200, {
                    "source": "Local CSV", 
                    "count": len(full_data),
                    "page": page,
                    "total_pages": (len(full_data) + limit - 1) // limit,
                    "data": paginated_data
                })
            except Exception:
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
                if not isinstance(data, list): data = []
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
            except Exception:
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
        safe_msg = str(message)[:100] if message else "Unknown Error"
        if not DEBUG_MODE:
            safe_msg = "Internal Server Error" # Hide details in production
        
        body = json.dumps({"error": safe_msg}).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(body))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        # Optional: Log to file in production instead of console
        # print(f"{args[0]}") 
        pass 

def safe_float_from_planet(planet, key, default):
    val = planet.get(key)
    if not val or val == '' or val is None: return default
    try:
        return float(str(val).strip())
    except ValueError:
        return default

def sanitize_output(text):
    if not text: return ""
    cleaned = re.sub(r'[^\w\s\-\.]', '', str(text))
    return cleaned.strip()[:100]

if __name__ == '__main__':
    if not os.path.exists(FRONTEND_DIR):
        print(f"❌ ERROR: Frontend missing at {FRONTEND_DIR}")
        sys.exit(1)

    cleanup_old_cache()
    print(f"\n🚀 SERVER STARTING ON http://localhost:{PORT}")
    print(f"   Serving: {FRONTEND_DIR}")
    
    socketserver.TCPServer.allow_reuse_address = True
    time.sleep(0.5)

    try:
        with socketserver.TCPServer(("", PORT), SecureHandler) as httpd:
            print("✅ Server is secure and running.")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Stopped by user.")
    except OSError as e:
        if e.errno == 98: 
            print(f"\n❌ Port {PORT} is in use. Please stop the process or change PORT env var.")
        else: 
            raise