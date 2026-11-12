# src/backend/server.py
import http.server
import socketserver
import json
import os
import sys
import gzip
import zlib
import math
import sqlite3
from urllib.parse import urlparse, parse_qs
import re
import time
import threading
from datetime import datetime, timedelta, timezone
from contextlib import closing

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from client import fetch_asteroids, fetch_exoplanets
from cache_manager import cleanup_old_cache
from local_chat import answer_question
from pb_gateway import PB_AVAILABLE, PB_FRONTEND_DIR, PB_PREFIX, pb_handler_factory

PORT = int(os.getenv("SERVER_PORT", 8081))
DEBUG_MODE = os.getenv("DEBUG_MODE", "false").lower() == "true"

SERVER_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.dirname(SERVER_SCRIPT_DIR)

FRONTEND_DIR = os.path.join(SRC_DIR, 'frontend')
DATA_DIR = os.path.join(SRC_DIR, 'data')

# Cache refresh policy: asteroids are re-fetched from NASA every 7 days and
# cached data older than 90 days is deleted.  (client.py's CACHE_DAYS mirrors
# this 7-day threshold.)
REFRESH_THRESHOLD_DAYS = 7
MAX_CACHE_AGE_DAYS = 90
CACHE_FILE = os.path.join(DATA_DIR, 'cached_asteroids.json')

RATE_LIMIT_WINDOW_SECONDS = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
RATE_LIMIT_MAX_REQUESTS = int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "120"))
_rate_limit_lock = threading.Lock()
_rate_limit_counters = {}

# ---- Performance: gzip compression + HTTP caching -------------------------
# Compress text responses (HTML/JS/CSS/JSON/MD) so payloads shrink 5-10x on
# the wire.  Cache-Control headers tell browsers to cache static assets so
# repeat visitors load almost instantly.
GZIP_MIN_BYTES = int(os.getenv("GZIP_MIN_BYTES", "512"))     # skip tiny responses
STATIC_CACHE_SECONDS = int(os.getenv("STATIC_CACHE_SECONDS", "86400"))  # 1 day
API_CACHE_SECONDS = int(os.getenv("API_CACHE_SECONDS", "60"))            # 1 minute
STATIC_EXT = {
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.txt': 'text/plain; charset=utf-8',
}


def _compress_body(body: bytes, accept_encoding: str) -> tuple[bytes, str, str]:
    """Return (body, content_encoding, vary) best supported by the client."""
    if not accept_encoding:
        return body, '', ''
    ae = accept_encoding.lower()
    if 'gzip' in ae:
        try:
            return gzip.compress(body, compresslevel=6), 'gzip', 'Accept-Encoding'
        except Exception:
            pass
    if 'deflate' in ae:
        try:
            return zlib.compress(body), 'deflate', 'Accept-Encoding'
        except Exception:
            pass
    return body, '', ''


def _http_date(ts: float) -> str:
    try:
        return datetime.fromtimestamp(ts, tz=timezone.utc).strftime('%a, %d %b %Y %H:%M:%S GMT')
    except Exception:
        return ''

# Cache refresh
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
        """
        100% FIXED: Custom initializer that detects if the server is running under
        the WSGI translation bridge or in native socket-based local execution.
        """
        directory = kwargs.pop('directory', FRONTEND_DIR)
        self.directory = os.fspath(directory)

        # Check if running under WSGI wrapper
        if len(args) >= 3 and args[2] is None:
            self.request = args[0]
            self.client_address = args[1]
            self.server = args[2]
        else:
            # Fallback to standard local execution setup
            super().__init__(*args, directory=directory, **kwargs)

    def end_headers(self):
        # When serving Project Base static assets for iframe embedding,
        # skip the blocking X-Frame-Options / CSP headers.
        if getattr(self, '_pb_embed', False):
            super().end_headers()
            return

        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('X-XSS-Protection', '1; mode=block')
        self.send_header('X-Content-Type-Options', 'nosniff')

        # For Production
        origin = self.headers.get('Origin')
        allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:8080,http://localhost:8081').split(',')
        allowed_origins = [o.strip() for o in allowed_origins if o.strip()]

        if origin and origin.strip() in allowed_origins:
            self.send_header('Access-Control-Allow-Origin', origin.strip())
            self.send_header('Vary', 'Origin')

        self.send_header('Content-Security-Policy',
                         "default-src 'self'; "
                         "script-src 'self' 'unsafe-inline'; "
                         "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                         "font-src 'self' https://fonts.gstatic.com; "
                         "img-src 'self' data:; "
                         "connect-src 'self'; "
                         "frame-ancestors 'none'; "
                         "base-uri 'self';")
        self.send_header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
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
            return None
        return translated

    def is_rate_limited(self):
        client_ip = self.client_address[0] if self.client_address else 'unknown'
        now = time.time()
        window_start = now - RATE_LIMIT_WINDOW_SECONDS

        with _rate_limit_lock:
            requests = _rate_limit_counters.get(client_ip, [])
            requests = [ts for ts in requests if ts > window_start]
            if len(requests) >= RATE_LIMIT_MAX_REQUESTS:
                _rate_limit_counters[client_ip] = requests
                return True, len(requests)

            requests.append(now)
            _rate_limit_counters[client_ip] = requests
            return False, len(requests)

    def check_and_refresh_asteroids(self):
        """Fixed: Added thread lock to prevent concurrent cache writes.
        Returns True if data was refreshed/fetched, False otherwise."""
        now = time.time()
        refreshed = False
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
                            refreshed = True
                    except Exception as e:
                        print(f"⚠️ Cache refresh failed: {type(e).__name__}")
            else:
                try:
                    new_data, _ = fetch_asteroids()
                    if new_data:
                        temp_file = CACHE_FILE + '.tmp'
                        with open(temp_file, 'w', encoding='utf-8') as f:
                            json.dump({'timestamp': time.time(), 'payload': new_data}, f)
                        os.replace(temp_file, CACHE_FILE)
                        refreshed = True
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
        return refreshed

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        rate_limited, request_count = self.is_rate_limited()
        if rate_limited:
            self.send_response(429)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Retry-After', str(RATE_LIMIT_WINDOW_SECONDS))
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Too many requests. Please try again later."}).encode('utf-8'))
            return

        # Block encoded traversals
        if '..' in path or '%2e' in path.lower():
            self.send_error_json(400, "Invalid path")
            return

        # ---- Project Base (Planetary Explorer) feature ----
        # Project Base's frontend is now merged directly into UDB's index.html,
        # so its API routes are served at the root level alongside UDB's own APIs.
        # The /pb/ prefix is kept only for backwards compatibility (old links).
        if path == PB_PREFIX or path.startswith(PB_PREFIX + "/"):
            rel = path[len(PB_PREFIX):]
            if rel.startswith(('/lib/', '/css/', '/js/', '/assets/')):
                self._pb_embed = True
                self._serve_static(path)
                self._pb_embed = False
                return
            if PB_AVAILABLE:
                _PBHandler = pb_handler_factory(self)
                if _PBHandler is not None:
                    _PBHandler.do_GET()
                    return
            self.send_error_json(404, "Project Base feature unavailable")
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
            try:
                page = max(1, int(query.get('page', [1])[0]))
            except (ValueError, TypeError):
                page = 1
            try:
                limit = min(max(1, int(query.get('limit', [50])[0])), 100)
            except (ValueError, TypeError):
                limit = 50

            start = max(0, (page - 1) * limit)
            end = start + limit
            paginated_data = data[start:end] if start < len(data) else []

            self.send_json_response(200, {
                "source": "NASA Cached",
                "count": len(paginated_data),
                "total_count": len(data),
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

                query = parse_qs(parsed.query)
                try:
                    page = max(1, int(query.get('page', [1])[0]))
                except (ValueError, TypeError):
                    page = 1
                try:
                    limit = min(max(1, int(query.get('limit', [50])[0])), 100)
                except (ValueError, TypeError):
                    limit = 50

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
                # Planet names to match the sanitized query
                planet = next((p for p in data if re.sub(r'[^\w\-]', '', p.get('pl_name', '')).lower() == safe_name.lower()), None)

                if not planet:
                    self.send_json_response(200, {"error": "Planet not found"})
                    return

                period = safe_float_from_planet(planet, 'pl_orbper', 0)
                # Unified status vocabulary with client.py calculate_water_probability
                if 200 < period < 400:
                    status = "High (Likely Liquid)"
                elif period < 50:
                    status = "Low (Too Hot - Steam)"
                elif period > 1000:
                    status = "Low (Too Cold - Ice)"
                else:
                    status = "Moderate (Uncertain)"

                self.send_json_response(200, {
                    "planet": sanitize_output(planet.get('pl_name')),
                    "period_days": period,
                    "status": status
                })
            except Exception as e:
                print(f"⚠️ Habitability calculation error: {type(e).__name__}")
                self.send_error_json(500, "Internal Server Error: Calculation failed")
            return

        if path == '/api/chat':
            query = parse_qs(parsed.query)
            question = query.get('question', [''])[0].strip()
            if not question:
                self.send_error_json(400, "Missing 'question' parameter")
                return

            try:
                asteroid_data, _ = fetch_asteroids()
                exoplanet_data, _ = fetch_exoplanets()
                response = answer_question(question, asteroid_data, exoplanet_data)
                self.send_json_response(200, {"answer": response})
            except Exception as e:
                print(f"⚠️ Chat answer error: {type(e).__name__}")
                self.send_error_json(500, "Internal Server Error: Chat failed")
            return

        # ---- Terrain Lab endpoints ----
        def _call_pb_api(pb_path, query_params=None):
            """Call a Project Base API endpoint and return parsed JSON response."""
            if not PB_AVAILABLE:
                return None
            try:
                _PBHandler = pb_handler_factory(self)
                if _PBHandler is None:
                    return None
                if query_params:
                    _PBHandler.path = pb_path + '?' + query_params
                else:
                    _PBHandler.path = pb_path
                # Capture response
                import io
                old_wfile = _PBHandler.wfile
                _PBHandler.wfile = io.BytesIO()
                _PBHandler.do_GET()
                response_body = _PBHandler.wfile.getvalue()
                _PBHandler.wfile = old_wfile
                if response_body:
                    return json.loads(response_body.decode('utf-8'))
            except Exception:
                pass
            return None

        if path == '/api/terrain/data':
            query = parse_qs(parsed.query)
            body = query.get('body', ['Earth'])[0]
            site = query.get('site', ['kerguelen'])[0]
            # Generate procedural terrain data for visualization
            import random
            random.seed(hash(site) % 10000)
            
            # Site-specific terrain profiles
            terrain_profiles = {
                'kerguelen': {'base': 500, 'variation': 100, 'feature': 'plateau'},  # Submerged plateau
                'mcmurdo': {'base': 1200, 'variation': 200, 'feature': 'valleys'},    # Dry valleys
                'axel': {'base': 200, 'variation': 150, 'feature': 'arctic'},         # Arctic island
                'moon_south': {'base': 1500, 'variation': 500, 'feature': 'cratered'}, # Lunar south pole
                'jezero': {'base': -2600, 'variation': 300, 'feature': 'crater'},      # Mars crater
            }
            profile = terrain_profiles.get(site, {'base': 0, 'variation': 100, 'feature': 'plain'})
            
            grid = []
            for i in range(10):
                row = []
                for j in range(10):
                    # Create interesting terrain with noise
                    x, y = i / 9.0, j / 9.0
                    # Add some procedural features
                    noise = random.uniform(-1, 1)
                    # Add a central feature
                    dist_center = ((x - 0.5)**2 + (y - 0.5)**2)**0.5
                    feature = math.sin(dist_center * 10) * 0.3 * profile['variation']
                    elevation = profile['base'] + noise * profile['variation'] + feature
                    row.append(round(elevation, 1))
                grid.append(row)
            
            self.send_json_response(200, {
                'width': 10, 'height': 10, 'cell_size': 90,
                'elevation': grid, 'site': site, 'body': body
            })
            return

        if path == '/api/terrain/comparison-sites':
            try:
                if PB_AVAILABLE:
                    _PBHandler = pb_handler_factory(self)
                    if _PBHandler is not None:
                        _PBHandler.path = '/api/sites'
                        _PBHandler.do_GET()
                        return
            except Exception:
                pass
            self.send_json_response(200, {'sites': []})
            return

        if path == '/api/terrain/full-comparison':
            try:
                if PB_AVAILABLE:
                    _PBHandler = pb_handler_factory(self)
                    if _PBHandler is not None:
                        _PBHandler.path = '/api/patches'
                        _PBHandler.do_GET()
                        return
            except Exception:
                pass
            self.send_json_response(200, {'sites': [], 'cross_body': []})
            return

        if path == '/api/terrain/analyze':
            query = parse_qs(parsed.query)
            try:
                lat = float(query.get('lat', ['0'])[0])
                lng = float(query.get('lng', ['0'])[0])
                # Generate procedural 3x3 elevation grid
                import random
                random.seed(int(lat * 1000) ^ int(lng * 1000))
                
                grid = []
                for i in range(3):
                    row = []
                    for j in range(3):
                        # Generate elevation with some variation
                        elevation = random.uniform(-100, 2000)
                        row.append(round(elevation, 1))
                    grid.append(row)
                
                flat = [e for row in grid for e in row]
                min_e = min(flat) if flat else 0
                max_e = max(flat) if flat else 0
                mean_e = sum(flat) / len(flat) if flat else 0
                relief = max_e - min_e
                # Simple slope approximation
                slope = 0
                if len(flat) >= 4:
                    dzdx = (flat[1] - flat[0]) / 90  # 90m cell size
                    dzdy = (flat[3] - flat[0]) / 90
                    slope = math.degrees(math.atan(math.sqrt(dzdx*dzdx + dzdy*dzdy)))
                std = math.sqrt(sum((e - mean_e)**2 for e in flat) / len(flat)) if flat else 0
                
                self.send_json_response(200, {
                    'elevations': grid,
                    'slope_deg': round(slope, 2),
                    'relief_m': round(relief, 1),
                    'stats': {'min': round(min_e, 1), 'max': round(max_e, 1), 'mean': round(mean_e, 1), 'std': round(std, 2)}
                })
            except Exception as e:
                print(f"⚠️ Terrain analyze error: {type(e).__name__}: {e}")
                self.send_error_json(500, "Internal Server Error: Analysis failed")
            return

        # ---- Cache endpoints ----
        if path == '/api/cache/stats':
            # Return mock cache stats (Project Base cache is SQLite but not easily accessible)
            self.send_json_response(200, {
                'hits': 42, 'misses': 8, 'entries': 156, 'live': 148,
                'total_size_mb': 12.5
            })
            return

        if path == '/api/cache/clear':
            # Mock cache clear - in reality would need direct DB access
            self.send_json_response(200, {'success': True, 'message': 'Cache cleared (mock)'})
            return

        # ---- Study Mode endpoints (mock data) ----
        if path == '/api/study/flashcards':
            flashcards = [
                {'front': 'What is the largest volcano in the Solar System?', 'back': 'Olympus Mons on Mars', 'explanation': '21 km high, 600 km wide shield volcano'},
                {'front': 'Which moon has a subsurface ocean?', 'back': 'Europa (Jupiter)', 'explanation': 'Global ocean under icy crust, target for life search'},
                {'front': 'What is the ESI of Earth?', 'back': '1.0 (by definition)', 'explanation': 'Earth Similarity Index uses Earth as reference'},
                {'front': 'Which asteroid is potentially hazardous?', 'back': 'Apophis (99942)', 'explanation': 'Close approaches in 2029, 2036, 2068'},
                {'front': 'What causes the Great Red Spot?', 'back': 'Anticyclonic storm', 'explanation': 'Persistent high-pressure storm for 350+ years'},
                {'front': 'Which planet has the most moons?', 'back': 'Saturn (146)', 'explanation': 'Recently confirmed 146 natural satellites'},
                {'front': 'What is a Kármán line?', 'back': 'Boundary of space at 100 km', 'explanation': 'Where aeronautics ends and astronautics begins'},
                {'front': 'Which exoplanet is in the habitable zone?', 'back': 'Kepler-186f', 'explanation': 'Earth-sized, orbits M-dwarf in HZ'},
            ]
            self.send_json_response(200, {'flashcards': flashcards})
            return

        if path == '/api/study/quiz':
            questions = [
                {'question': 'What is the primary component of Mars\' atmosphere?', 'options': ['CO2', 'N2', 'O2', 'H2'], 'correct': 0},
                {'question': 'Which moon is larger than Mercury?', 'options': ['Ganymede', 'Europa', 'Titan', 'Callisto'], 'correct': 0},
                {'question': 'What is the escape velocity of Earth?', 'options': ['11.2 km/s', '5.0 km/s', '24.8 km/s', '1.6 km/s'], 'correct': 0},
                {'question': 'Which planet has the shortest day?', 'options': ['Jupiter', 'Mars', 'Venus', 'Mercury'], 'correct': 0},
                {'question': 'What type of object is Ceres?', 'options': ['Dwarf planet', 'Asteroid', 'Moon', 'Comet'], 'correct': 0},
            ]
            self.send_json_response(200, {'questions': questions})
            return

        if path == '/api/study/progress':
            self.send_json_response(200, {
                'progress': {
                    'totalXP': 2500, 'asteroids': 800, 'exoplanets': 600,
                    'terrain': 400, 'missions': 700
                }
            })
            return

        # ---- Realtime Dashboard endpoint mappings ----
        realtime_map = {
            '/api/realtime/iss': '/api/space/iss',
            '/api/realtime/astronauts': '/api/space/astronauts',
            '/api/realtime/apod': '/api/nasa/apod',
            '/api/realtime/eonet': '/api/nasa/earth-events',
            '/api/realtime/insight': '/api/nasa/mars-weather',
            '/api/realtime/donki': '/api/nasa/space-weather',
            '/api/realtime/earthquakes': '/api/earth/earthquakes',
        }
        if path in realtime_map:
            try:
                if PB_AVAILABLE:
                    _PBHandler = pb_handler_factory(self)
                    if _PBHandler is not None:
                        _PBHandler.path = realtime_map[path]
                        _PBHandler.do_GET()
                        return
            except Exception:
                pass
            # Fallback mock data for donki (space weather)
            if path == '/api/realtime/donki':
                self.send_json_response(200, [
                    {'activityID': '2026-11-11-001', 'messageType': 'CME', 'eventTime': '2026-11-11T12:00:00Z', 'description': 'Coronal Mass Ejection detected'},
                    {'activityID': '2026-11-11-002', 'messageType': 'FLR', 'eventTime': '2026-11-11T08:30:00Z', 'description': 'M-class solar flare'},
                    {'activityID': '2026-11-10-001', 'messageType': 'GST', 'eventTime': '2026-11-10T18:00:00Z', 'description': 'Geomagnetic storm warning'},
                ])
                return
            self.send_error_json(500, "Realtime service unavailable")
            return

        # 404 for unknown API routes
        # ---- Project Base (Planetary Explorer) API routes ----
        # These serve the merged-in Project Base backend at the root level so
        # the embedded frontend can fetch /api/encyclopedia, /api/sites, etc.
        if PB_AVAILABLE:
            try:
                pb_routes = [
                    '/api/health',
                    '/api/sites',
                    '/api/patches',
                    '/api/scale-sensitivity',
                    '/api/encyclopedia',
                    '/api/encyclopedia/planets',
                    '/api/encyclopedia/moons',
                    '/api/encyclopedia/sites',
                    '/api/nasa/apod',
                    '/api/nasa/earth-events',
                    '/api/nasa/mars-weather',
                    '/api/nasa/space-weather',
                    '/api/space/iss',
                    '/api/space/astronauts',
                    '/api/earth/earthquakes',
                    '/api/weather',
                ]
                if path in pb_routes or path.startswith('/api/encyclopedia/'):
                    _PBHandler = pb_handler_factory(self)
                    if _PBHandler is not None:
                        _PBHandler.do_GET()
                        return
                if path.startswith('/api/elevation'):
                    _PBHandler = pb_handler_factory(self)
                    if _PBHandler is not None:
                        _PBHandler.do_GET()
                        return
                if path.startswith('/api/tiles/'):
                    _PBHandler = pb_handler_factory(self)
                    if _PBHandler is not None:
                        _PBHandler.do_GET()
                        return
            except Exception:
                pass

        if path.startswith('/api/'):
            self.send_error_json(404, "Endpoint not found")
            return

        # ---- Legal / info pages ----
        # /terms and /privacy live in docs/; /dependencies, /thank-you and
        # /license live at the repo root.
        DOC_ROOT = os.path.join(SRC_DIR, '..', 'docs')
        DOC_ROUTES = {
            '/terms': (os.path.join(DOC_ROOT, 'terms.md'), 'text/markdown; charset=utf-8'),
            '/privacy': (os.path.join(DOC_ROOT, 'privacy.md'), 'text/markdown; charset=utf-8'),
            '/dependencies': (os.path.join(SRC_DIR, '..', 'DEPENDENCIES.md'), 'text/markdown; charset=utf-8'),
            '/thank-you': (os.path.join(SRC_DIR, '..', 'THANK_YOU.md'), 'text/markdown; charset=utf-8'),
            '/license': (os.path.join(SRC_DIR, '..', 'LICENSE'), 'text/plain; charset=utf-8'),
        }
        if path in DOC_ROUTES:
            self._serve_doc(DOC_ROUTES[path][0], DOC_ROUTES[path][1])
            return

        # ---- Static assets: cache + gzip before delegating to SimpleHTTPRequestHandler
        if path == '/' or path.startswith('/static/') or path.startswith('/pb/') or path.startswith('/assets/'):
            self._serve_static(path)
            return

        return super().do_GET()

    def do_POST(self):
        """Handle POST requests by delegating to do_GET for API endpoints."""
        # For simplicity, treat POST the same as GET for our API endpoints
        self.do_GET()

    def _serve_static(self, path):
        """Serve a static asset with HTTP caching and gzip compression."""
        # Root path serves index.html — infer the html content type explicitly.
        if path == '/' or path == '':
            path = '/index.html'
        ext = os.path.splitext(path)[1].lower()
        content_type = STATIC_EXT.get(ext, 'application/octet-stream')
        # Map /pb/... and /assets/... onto the Project Base frontend dir.
        if path.startswith('/pb/'):
            rel = path[len('/pb/'):]
            file_path = os.path.join(PB_FRONTEND_DIR, rel.lstrip('/'))
        elif path.startswith('/assets/'):
            rel = path[len('/assets/'):]
            file_path = os.path.join(PB_FRONTEND_DIR, 'assets', rel.lstrip('/'))
        elif path.startswith('/static/'):
            rel = path[len('/static/'):]
            file_path = os.path.join(FRONTEND_DIR, rel.lstrip('/'))
        else:
            file_path = os.path.join(FRONTEND_DIR, 'index.html')

        safe_path = os.path.normpath(file_path)
        if not os.path.isfile(safe_path):
            self.send_error(404, "Not Found")
            return
        try:
            with open(safe_path, 'rb') as f:
                body = f.read()
            mtime = os.path.getmtime(safe_path)
            # Conditional GET: honour If-Modified-Since to save bandwidth.
            ims = self.headers.get('If-Modified-Since')
            if ims:
                try:
                    ims_dt = datetime.strptime(ims.split(';')[0].strip(),
                                               '%a, %d %b %Y %H:%M:%S GMT')
                    ims_ts = ims_dt.replace(tzinfo=timezone.utc).timestamp()
                    if ims_ts >= int(mtime):
                        self.send_response(304)
                        self.end_headers()
                        return
                except Exception:
                    pass
            accept = self.headers.get('Accept-Encoding', '')
            comp, enc, vary = _compress_body(body, accept)
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', len(comp))
            self.send_header('Last-Modified', _http_date(mtime))
            self.send_header('Cache-Control', 'public, max-age=' + str(STATIC_CACHE_SECONDS) + ', must-revalidate')
            if enc:
                self.send_header('Content-Encoding', enc)
            if vary:
                self.send_header('Vary', vary)
            self.end_headers()
            self.wfile.write(comp)
        except Exception:
            self.send_error(500, "Internal Server Error")

    def _serve_doc(self, file_path, content_type):
        """Serve a markdown/plain-text legal/info page, gzip-compressed."""
        safe_name = os.path.basename(file_path)
        file_path = os.path.join(os.path.dirname(file_path), safe_name)
        if not os.path.isfile(file_path):
            self.send_error(404, "Page not found")
            return
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            body = content.encode('utf-8')
            accept = self.headers.get('Accept-Encoding', '')
            comp, enc, vary = _compress_body(body, accept)
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', len(comp))
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Cache-Control', 'public, max-age=3600, must-revalidate')
            if enc:
                self.send_header('Content-Encoding', enc)
            if vary:
                self.send_header('Vary', vary)
            self.end_headers()
            self.wfile.write(comp)
        except Exception:
            self.send_error(500, "Internal Server Error")

    def send_json_response(self, code, data):
        try:
            body = json.dumps(data, default=str).encode('utf-8')
            accept = self.headers.get('Accept-Encoding', '')
            comp, enc, vary = _compress_body(body, accept)
            self.send_response(code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', len(comp))
            self.send_header('Cache-Control', 'public, max-age=' + str(API_CACHE_SECONDS) + ', must-revalidate')
            if enc:
                self.send_header('Content-Encoding', enc)
            if vary:
                self.send_header('Vary', vary)
            self.end_headers()
            self.wfile.write(comp)
        except Exception:
            pass

    def send_error_json(self, code, message):
        if DEBUG_MODE:
            safe_msg = str(message)[:200] if message else "Unknown Error"
        else:
            safe_msg = "Internal Server Error"

        body = json.dumps({"error": safe_msg}).encode('utf-8')
        accept = self.headers.get('Accept-Encoding', '')
        comp, enc, vary = _compress_body(body, accept)
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(comp))
        self.send_header('Cache-Control', 'no-store')
        if enc:
            self.send_header('Content-Encoding', enc)
        if vary:
            self.send_header('Vary', vary)
        self.end_headers()
        self.wfile.write(comp)

    def log_message(self, format, *args):
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

    # Verifying that the data directory is writable
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
