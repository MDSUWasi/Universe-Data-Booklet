#!/usr/bin/env python3
"""Download encyclopedia reference images (Wikimedia Commons) into
Project Base/frontend/assets/encyclopedia/ so the Planetary Explorer works
offline.  Public-domain / CC images; attribution recorded in the
encyclopedia module and DEPENDENCIES.md.
"""
import json, os, sys, urllib.request, urllib.parse, time

UA = "Mozilla/5.0 (X11; Linux x86_64) UniverseDataBooklet/1.0"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                   "..", "Project Base", "frontend", "assets", "encyclopedia")
OUT = os.path.normpath(OUT)
os.makedirs(OUT, exist_ok=True)

# body_id -> (search query, local filename)
TARGETS = {
    "sun":      ("Sun_in_SDO_AIA_171.jpg", "sun.jpg"),
    "mercury":  ("Mercury_in_color_-_Prockter07_centered.jpg", "mercury.jpg"),
    "venus":    ("Venus_from_Mariner_10.jpg", "venus.jpg"),
    "earth":    ("Blue_Marble_2012.jpg", "earth.jpg"),
    "moon":     ("Moon_near_side_LRO_WAC.jpg", "moon.jpg"),
    "mars":     ("OSIRIS_Mars_true_color.jpg", "mars.jpg"),
    "jupiter":  ("Portrait_of_Jupiter_from_Cassini.jpg", "jupiter.jpg"),
    "saturn":   ("Saturn_global_view_from_Cassini,_rings_open_Better_Colour.png", "saturn.jpg"),
    "uranus":   ("Uranus_Voyager2_color_calibrated.png", "uranus.jpg"),
    "neptune":  ("Neptune_Voyager2_color_calibrated.png", "neptune.jpg"),
    "pluto":    ("Pluto_in_3-D.jpg", "pluto.jpg"),
    "ceres":    ("Ceres_-_RC3_-_Haulani_Crater_(22381131691)_(cropped).jpg", "ceres.jpg"),
    "io":       ("Io_comparison_with_Earth_and_Moon.png", "io.jpg"),
    "europa":   ("PIA19048_realistic_color_Europa_mosaic_edited.jpg", "europa.jpg"),
    "ganymede": ("Ganymede_-_Perijove_34_Composite.jpg", "ganymede.jpg"),
    "callisto": ("Callisto-scarp.jpg", "callisto.jpg"),
    "titan":    ("Titan_in_front_of_the_ring_and_Saturn.jpg", "titan.jpg"),
    "enceladus":("Enceladus_with_Saturn_(20901575102).jpg", "enceladus.jpg"),
    "triton":   ("PIA00340_Montage_of_Neptune_and_Triton.jpg", "triton.jpg"),
    "phobos":   ("Phobos_as_seen_by_Mars_Global_Surveyor_(PSI).jpg", "phobos.jpg"),
    "deimos":   ("Deimos_as_seen_by_Mars_Global_Surveyor_(PSI).jpg", "deimos.jpg"),
}

def thumb_url(search_file):
    """Resolve a Wikimedia Commons filename to a 330px thumbnail URL."""
    params = {
        "action": "query", "format": "json", "generator": "search",
        "gsrsearch": "File:" + search_file, "gsrnamespace": "6",
        "prop": "imageinfo", "iiprop": "url|mime", "iiurlwidth": "330",
        "gsrlimit": "1",
    }
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read().decode("utf-8"))
    pages = data.get("query", {}).get("pages", {})
    for p in pages.values():
        ii = (p.get("imageinfo") or [{}])[0]
        return ii.get("thumburl") or ii.get("url")
    return None

def download(url, dest):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "image/*"})
    with urllib.request.urlopen(req, timeout=40) as r:
        body = r.read()
    with open(dest, "wb") as f:
        f.write(body)
    return len(body)

def main():
    manifest = {}
    for body, (search_file, local) in TARGETS.items():
        dest = os.path.join(OUT, local)
        if os.path.exists(dest) and os.path.getsize(dest) > 1000:
            manifest[body] = {"file": local, "bytes": os.path.getsize(dest),
                              "source": "Wikimedia Commons", "cached": True}
            print(f"cached  {body:12} -> {local}")
            continue
        try:
            u = thumb_url(search_file)
            if not u:
                print(f"NO-URL  {body}")
                continue
            n = download(u, dest)
            manifest[body] = {"file": local, "bytes": n, "source": "Wikimedia Commons",
                              "url": u}
            print(f"OK      {body:12} -> {local} ({n} bytes)")
            time.sleep(0.3)
        except Exception as e:
            print(f"FAIL    {body}: {type(e).__name__}: {e}")
    with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print(f"\nSaved manifest for {len(manifest)} bodies.")

if __name__ == "__main__":
    main()