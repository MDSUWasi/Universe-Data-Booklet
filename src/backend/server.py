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

PORT = 8081
SERVER_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))          # .../src/backend
SRC_DIR = os.path.dirname(SERVER_SCRIPT_DIR)                            # .../src

# CRITICAL UPDATE: Both Frontend and Data are inside SRC_DIR
FRONTEND_DIR = os.path.join(SRC_DIR, 'frontend')                        # .../src/frontend
DATA_DIR = os.path.join(SRC_DIR, 'data')                                # .../src/data

REFRESH_THRESHOLD_DAYS = 30
MAX_CACHE_AGE_DAYS = 90
CACHE_FILE = os.path.join(DATA_DIR, 'cached_asteroids.json')

print(f"\n🚀 SERVER STARTING")
print(f"   Frontend: {FRONTEND_DIR} ({os.path.exists(FRONTEND_DIR)})")
print(f"   Data:     {DATA_DIR} ({os.path.exists(DATA_DIR)})")

class SecureHandler(http.server.SimpleHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def end_headers(self):
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('X-XSS-Protection', '1; mode=block')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'max-age=3600') 
        super().end_headers()

    def check_and_refresh_asteroids(self):
        now = time.time()
        if os.path.exists(CACHE_FILE):
            age_days = (now - os.stat(CACHE_FILE).st_mtime) / 86400
            if age_days > REFRESH_THRESHOLD_DAYS:
                new_data, _ = fetch_asteroids()
                if new_data:
                    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
                        json.dump({'timestamp': time.time(), 'payload': new_data}, f)
                    print(f"✅ Refreshed asteroids ({len(new_data)})")
            else:
                print(f"ℹ️ Cache fresh ({age_days:.1f} days)")
        else:
            new_data, _ = fetch_asteroids()
            if new_data:
                with open(CACHE_FILE, 'w', encoding='utf-8') as f:
                    json.dump({'timestamp': time.time(), 'payload': new_data}, f)
        
        if os.path.exists(DATA_DIR):
            for f in os.listdir(DATA_DIR):
                fp = os.path.join(DATA_DIR, f)
                if os.path.isfile(fp) and f.endswith('.json'):
                    if (time.time() - os.path.getmtime(fp)) / 86400 > MAX_CACHE_AGE_DAYS:
                        os.remove(fp)
                        print(f"🗑️ Deleted old cache: {f}")
        return False

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        
        if path == '/api/asteroids':
            self.check_and_refresh_asteroids()
            if os.path.exists(CACHE_FILE):
                with open(CACHE_FILE, 'r') as f:
                    data = json.load(f).get('payload', [])
            else:
                data = []
            self.send_json_response(200, {"source": "NASA Cached", "count": len(data), "data": data})
            return

        if path == '/api/exoplanets':
            try:
                data, _ = fetch_exoplanets()
                if not isinstance(data, list): data = []
                print(f"📊 Sending {len(data)} exoplanets")
                self.send_json_response(200, {"source": "Local CSV", "count": len(data), "data": data})
            except Exception as e:
                print(f"❌ Exo Error: {e}")
                self.send_error_json(500, str(e))
            return

        if path == '/api/habitability':
            query = parse_qs(parsed.query)
            name = query.get('name', [''])[0]
            if not name:
                self.send_error_json(400, "Missing name")
                return
            safe_name = re.sub(r'[^\w\s\-\.]', '', name)[:100].lower()
            try:
                data, _ = fetch_exoplanets()
                if not isinstance(data, list): data = []
                planet = next((p for p in data if p.get('pl_name', '').lower() == safe_name), None)
                if not planet:
                    self.send_json_response(200, {"error": "Not found"})
                    return
                period = float(planet.get('pl_orbper', 0) or 0)
                status = "High" if 200 < period < 400 else "Hot" if period < 50 else "Cold" if period > 1000 else "Unknown"
                self.send_json_response(200, {"planet": planet.get('pl_name'), "period_days": period, "status": status})
            except Exception as e:
                self.send_error_json(500, str(e))
            return

        return super().do_GET()

    def send_json_response(self, code, data):
        body = json.dumps(data).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(body))
        self.end_headers()
        self.wfile.write(body)

    def send_error_json(self, code, message):
        body = json.dumps({"error": message}).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(body))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        pass 

if __name__ == '__main__':
    if not os.path.exists(FRONTEND_DIR):
        print(f"❌ ERROR: Frontend missing at {FRONTEND_DIR}")
        sys.exit(1)

    cleanup_old_cache()
    print(f"\n🚀 SERVER STARTING ON http://localhost:{PORT}")
    print(f"   Serving: {FRONTEND_DIR}")
    
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("", PORT), SecureHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Stopped.")
    except OSError as e:
        if e.errno == 98: print(f"\n❌ Port {PORT} in use!")
        else: raise