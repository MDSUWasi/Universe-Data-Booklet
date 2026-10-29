"""Flask entrypoint. Serves the site comparison API and the frontend."""
import json, os
from flask import Flask, jsonify, send_from_directory

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPORTS = os.path.join(BASE, "output", "reports")
FRONTEND = os.path.join(BASE, "frontend")

app = Flask(__name__, static_folder=None)


@app.route("/api/sites")
def sites():
    """Return the five-site comparison table as JSON."""
    path = os.path.join(REPORTS, "all_sites_comparison.csv")
    rows = []
    if os.path.exists(path):
        with open(path) as fh:
            header = fh.readline().strip().split(",")
            for line in fh:
                vals = line.strip().split(",")
                if len(vals) == len(header):
                    rows.append(dict(zip(header, vals)))
    return jsonify({"count": len(rows), "sites": rows})


@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/")
def index():
    return send_from_directory(FRONTEND, "index.html")


@app.route("/<path:p>")
def static_files(p):
    return send_from_directory(FRONTEND, p)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
