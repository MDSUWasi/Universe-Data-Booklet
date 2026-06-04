#!/usr/bin/env python3
"""
Universe Data Booklet - Backend Server
Serves the frontend and handles data processing for habitability analysis.
"""

import http.server
import socketserver
import json
import csv
import os
import math
from urllib.parse import urlparse, parse_qs

# Configuration
PORT = 8000
DATA_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'data')
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), '..', 'frontend')

class UniverseHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Serve static files from the 'frontend' directory
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def do_GET(self):
        parsed_path = urlparse(self.path)
        
        # Route: /api/asteroids
        if parsed_path.path == '/api/asteroids':
            self.send_json_response(self.load_asteroids())
            return

        # Route: /api/exoplanets
        if parsed_path.path == '/api/exoplanets':
            self.send_json_response(self.load_exoplanets())
            return

        # Route: /api/habitability?planet_name=...
        if parsed_path.path == '/api/habitability':
            params = parse_qs(parsed_path.query)
            planet_name = params.get('planet_name', [None])[0]
            if planet_name:
                self.send_json_response(self.calculate_habitability(planet_name))
            else:
                self.send_error(400, "Missing planet_name parameter")
            return

        # Default: Serve index.html
        return super().do_GET()

    def send_json_response(self, data):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*') # Allow local frontend access
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def load_asteroids(self):
        """Loads asteroids.json and returns the list."""
        filepath = os.path.join(DATA_DIR, 'asteroids.json')
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
                # Return just the list of asteroids if the root is a dict with a key
                return data.get('close_approach_data', data) if isinstance(data, dict) else data
        except FileNotFoundError:
            return {"error": "asteroids.json not found in data/ folder"}

    def load_exoplanets(self):
        """Loads exoplanets.csv and converts to JSON."""
        filepath = os.path.join(DATA_DIR, 'exoplanets.csv')
        planets = []
        try:
            with open(filepath, newline='', encoding='utf-8') as csvfile:
                reader = csv.DictReader(csvfile)
                for row in reader:
                    # Clean up numeric fields for easier frontend use
                    cleaned_row = {}
                    for k, v in row.items():
                        if v == '' or v is None:
                            cleaned_row[k] = None
                        elif k in ['pl_orbper', 'pl_rade', 'pl_bmasse', 'disc_year']:
                            try:
                                cleaned_row[k] = float(v)
                            except ValueError:
                                cleaned_row[k] = v
                        else:
                            cleaned_row[k] = v
                    planets.append(cleaned_row)
            return planets
        except FileNotFoundError:
            return {"error": "exoplanets.csv not found in data/ folder"}

    def calculate_habitability(self, planet_name):
        """
        Calculates water probability for a specific planet.
        NOTE: This is a simplified model. Real calculation requires stellar data.
        """
        planets = self.load_exoplanets()
        planet = next((p for p in planets if p.get('pl_name') == planet_name), None)

        if not planet:
            return {"error": "Planet not found"}

        # --- SIMULATED LOGIC FOR DEMO ---
        # In a real app, we would fetch stellar luminosity here.
        # For now, we will simulate a result based on orbital period to show the UI works.
        
        period = planet.get('pl_orbper')
        mass = planet.get('pl_bmasse')
        radius = planet.get('pl_rade')

        result = {
            "planet": planet_name,
            "status": "Analysis Complete",
            "data": {
                "orbital_period_days": period,
                "mass_earth_units": mass,
                "radius_earth_units": radius
            },
            "water_probability": "Calculating...", 
            "note": "Stellar data required for precise calculation. Using placeholder logic for demo."
        }

        # Placeholder logic: If period is between 200-400 days, assume Habitable Zone
        if period and 200 < period < 400:
            result["water_probability"] = "High (Habitable Zone)"
            result["temperature_range"] = "273K - 373K"
        elif period and period < 50:
            result["water_probability"] = "Low (Too Hot)"
            result["temperature_range"] = "> 373K"
        else:
            result["water_probability"] = "Low (Too Cold)"
            result["temperature_range"] = "< 273K"

        return result

    def log_message(self, format, *args):
        # Suppress default noisy logs for cleaner terminal
        print(f"[Server] {args[0]}")

if __name__ == '__main__':
    print(f"🚀 Starting Universe Data Booklet Server on port {PORT}...")
    print(f"📂 Serving frontend from: {FRONTEND_DIR}")
    print(f"📂 Loading data from: {DATA_DIR}")
    print("🌐 Open your browser to: http://localhost:8000")
    
    with socketserver.TCPServer(("", PORT), UniverseHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped.")