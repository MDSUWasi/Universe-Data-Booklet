#!/usr/bin/env python3
"""
Universe Data Booklet - Enhanced Backend
Features: Pagination, Filtering, Full Data Export, Habitability Calculation
"""

import http.server
import socketserver
import json
import csv
import os
import math
from urllib.parse import urlparse, parse_qs

# Configuration
PORT = 8080  # Lumo: Changed to 8080 to avoid port conflict
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'data')
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), '..', 'frontend')

class UniverseHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def do_GET(self):
        parsed_path = urlparse(self.path)
        query_params = parse_qs(parsed_path.query)

        # --- API ROUTES ---

        # 1. List Asteroids (with pagination & search)
        if parsed_path.path == '/api/asteroids':
            page = int(query_params.get('page', [1])[0])
            limit = int(query_params.get('limit', [20])[0])
            search = query_params.get('search', [''])[0]
            self.send_json_response(self.get_asteroids(page, limit, search))
            return

        # 2. List Exoplanets (with pagination & search)
        if parsed_path.path == '/api/exoplanets':
            page = int(query_params.get('page', [1])[0])
            limit = int(query_params.get('limit', [20])[0])
            search = query_params.get('search', [''])[0]
            self.send_json_response(self.get_exoplanets(page, limit, search))
            return

        # 3. Habitability Detail
        if parsed_path.path == '/api/habitability':
            planet_name = query_params.get('planet_name', [None])[0]
            if planet_name:
                self.send_json_response(self.calculate_habitability(planet_name))
            else:
                self.send_error(400, "Missing planet_name")
            return

        # 4. Download Full Data (CSV/JSON)
        if parsed_path.path == '/api/download/asteroids':
            self.send_file_download('asteroids.json', 'application/json')
            return
        if parsed_path.path == '/api/download/exoplanets':
            self.send_file_download('exoplanets.csv', 'text/csv')
            return

        # Default: Serve Frontend
        return super().do_GET()

    def send_json_response(self, data):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def send_file_download(self, filename, mime_type):
        filepath = os.path.join(DATA_DIR, filename)
        if not os.path.exists(filepath):
            self.send_error(404, "File not found")
            return
        
        self.send_response(200)
        self.send_header('Content-Type', mime_type)
        self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
        self.end_headers()
        
        with open(filepath, 'rb') as f:
            self.wfile.write(f.read())

    # --- DATA LOGIC ---

    def load_asteroids_raw(self):
        """
        Lumo: Robust loader to handle different JSON structures from NASA.
        It tries to find the list inside common keys like 'close_approach_data'.
        """
        filepath = os.path.join(DATA_DIR, 'asteroids.json')
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
                
                # Lumo: Handle nested structures
                if isinstance(data, dict):
                    # Try common keys found in NASA SBDB exports
                    for key in ['close_approach_data', 'asteroids', 'data', 'elements']:
                        if key in data:
                            return data[key]
                    # If it's a dict but no known key, return the whole thing as a list if possible
                    return [data] if not isinstance(data, list) else data
                elif isinstance(data, list):
                    return data
                else:
                    return []
        except FileNotFoundError:
            print(f"⚠️ Warning: {filepath} not found. Check your 'data' folder.")
            return []
        except json.JSONDecodeError as e:
            print(f"⚠️ Warning: Invalid JSON in {filepath}: {e}")
            return []

    def load_exoplanets_raw(self):
        filepath = os.path.join(DATA_DIR, 'exoplanets.csv')
        planets = []
        try:
            with open(filepath, newline='', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    cleaned = {}
                    for k, v in row.items():
                        if v == '' or v is None:
                            cleaned[k] = None
                        elif k in ['pl_orbper', 'pl_rade', 'pl_bmasse', 'disc_year']:
                            try: 
                                cleaned[k] = float(v)
                            except ValueError:
                                cleaned[k] = v
                        else:
                            cleaned[k] = v
                    planets.append(cleaned)
            return planets
        except FileNotFoundError:
            print(f"⚠️ Warning: {filepath} not found.")
            return []

    def get_asteroids(self, page, limit, search_term):
        data = self.load_asteroids_raw()
        if search_term:
            term = search_term.lower()
            # Lumo: Search in 'des' (designation) and 'cd' (date)
            data = [a for a in data if term in str(a.get('des', '')).lower() or term in str(a.get('cd', '')).lower()]
        
        total = len(data)
        start = (page - 1) * limit
        end = start + limit
        paginated = data[start:end]
        
        return {
            "total": total,
            "page": page,
            "limit": limit,
            "has_more": end < total,
            "data": paginated
        }

    def get_exoplanets(self, page, limit, search_term):
        data = self.load_exoplanets_raw()
        if search_term:
            term = search_term.lower()
            # Lumo: Search in 'pl_name' and 'hostname'
            data = [p for p in data if term in str(p.get('pl_name', '')).lower() or term in str(p.get('hostname', '')).lower()]
        
        total = len(data)
        start = (page - 1) * limit
        end = start + limit
        paginated = data[start:end]

        return {
            "total": total,
            "page": page,
            "limit": limit,
            "has_more": end < total,
            "data": paginated
        }

    def calculate_habitability(self, planet_name):
        planets = self.load_exoplanets_raw()
        planet = next((p for p in planets if p.get('pl_name') == planet_name), None)
        if not planet: 
            return {"error": "Planet not found"}

        period = planet.get('pl_orbper')
        # Lumo: Placeholder logic for demo. 
        # Real logic requires fetching stellar luminosity from an external DB.
        if period and 200 < period < 400:
            prob = "High (Habitable Zone)"
            temp = "273K - 373K"
        elif period and period < 50:
            prob = "Low (Too Hot)"
            temp = "> 373K"
        else:
            prob = "Low (Too Cold)"
            temp = "< 273K"

        return {
            "planet": planet_name,
            "status": "Analysis Complete",
            "data": planet,
            "water_probability": prob,
            "temperature_range": temp,
            "note": "Estimation based on orbital period. Stellar data required for precision."
        }

    def log_message(self, format, *args):
        # Lumo: Cleaner logs for the terminal
        print(f"[Server] {args[0]}")

if __name__ == '__main__':
    print(f"🚀 Universe Data Booklet Running on http://localhost:{PORT}")
    print(f"🔒 Privacy Mode: No external CDNs loaded.")
    with socketserver.TCPServer(("", PORT), UniverseHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Stopped.")