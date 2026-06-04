import http.server
import socketserver
import json
import os
import sys
from urllib.parse import urlparse, parse_qs
from client import fetch_asteroids, fetch_exoplanets

PORT = 8080
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(PROJECT_ROOT, '..', 'frontend')

class UniverseHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        # --- API ROUTES ---
        
        if path == '/api/asteroids':
            try:
                date = query.get('date', [''])[0]
                data, is_cached = fetch_asteroids(date)
                
                # Flatten data for frontend
                flat_list = []
                for day, objects in data.items():
                    for obj in objects:
                        try:
                            diam = obj['estimated_diameter']['meters']['estimated_diameter_min']
                            vel = obj['close_approach_data'][0]['relative_velocity']['kilometers_per_hour']
                        except:
                            diam, vel = 0, 0
                        
                        flat_list.append({
                            "id": obj['id'],
                            "name": obj['name'],
                            "date": day,
                            "diameter_km": round(diam/1000, 2),
                            "velocity_kmh": round(float(vel), 2),
                            "hazardous": obj['is_potentially_hazardous_asteroid']
                        })
                
                self.send_json_response({"source": "NASA NeoWs", "cached": is_cached, "count": len(flat_list), "data": flat_list})
            except Exception as e:
                self.send_error(500, str(e))
            return

        if path == '/api/exoplanets':
            try:
                data, is_cached = fetch_exoplanets()
                self.send_json_response({"source": "NASA Exoplanet Archive", "cached": is_cached, "count": len(data), "data": data})
            except Exception as e:
                self.send_error(500, str(e))
            return

        if path == '/api/habitability':
            planet_name = query.get('name', [''])[0]
            if not planet_name:
                self.send_error(400, "Missing planet name")
                return
            
            data, _ = fetch_exoplanets()
            planet = next((p for p in data if p.get('pl_name') == planet_name), None)
            
            if not planet:
                self.send_json_response({"error": "Planet not found"})
                return

            try:
                period = float(planet.get('pl_orbper', 0))
                status = "Unknown"
                if 200 < period < 400: status = "High (Habitable Zone)"
                elif period < 50: status = "Too Hot"
                elif period > 1000: status = "Too Cold"
                
                self.send_json_response({
                    "planet": planet_name,
                    "period_days": period,
                    "status": status,
                    "disclaimer": "Estimation only. Not for mission planning."
                })
            except:
                self.send_json_response({"error": "Calculation failed"})
            return

        # --- STATIC FILES ---
        return super().do_GET()

    def send_json_response(self, data):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def log_message(self, format, *args):
        print(f"[{self.address_string()}] {args[0]}")

if __name__ == '__main__':
    print(f"🚀 Universe Booklet Server on http://localhost:{PORT}")
    print(f"🛡️ Safety: Data cached locally. No direct API spam.")
    print(f"⚠️ Disclaimer: Educational use only.")
    
    with socketserver.TCPServer(("", PORT), UniverseHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Stopped.")