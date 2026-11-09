"""Encyclopedia data module.

Provides static, attribution-clean planetary data (planets, moons, diverse
terrain sites across multiple bodies) served through /api/encyclopedia/*.
Independent of the upstream service modules (elevation/weather/tiles/nasa).

All figures are compiled from public-domain NASA/USGS and ESA sources and are
suitable for an encyclopedia-style browse experience.  No landing-base focus:
every body lists multiple candidate regions so exploration is diverse, not
single-site.
"""

from __future__ import annotations

from typing import Any

# --------------------------------------------------------------------------- #
# Planetary bodies
# --------------------------------------------------------------------------- #

PLANETS: dict[str, dict[str, Any]] = {
    "earth": {
        "id": "earth",
        "name": "Earth",
        "symbol": "\U0001F30D",
        "type": "Terrestrial planet",
        "description": (
            "The third planet from the Sun and the only known world to support "
            "life. About 71 % of its surface is covered by liquid water oceans. "
            "Its nitrogen-oxygen atmosphere and global magnetic field shield the "
            "surface from harmful radiation. Plate tectonics continually reshape "
            "the crust, erasing most ancient craters."
        ),
        "physical": {
            "mean_diameter_km": 12742,
            "mass_kg": "5.972 × 10²⁴",
            "surface_gravity_ms2": 9.81,
            "escape_velocity_km_s": 11.19,
            "mean_distance_sun_au": 1.0,
            "orbital_period_days": 365.256,
            "rotation_period_hours": 23.93,
            "axial_tilt_deg": 23.44,
            "surface_temp_c": "≈ −89 °C to ≈ 57 °C",
            "atmosphere": "N₂ 78 %, O₂ 21 %, Ar 0.93 %, trace CO₂",
            "natural_satellites": 1,
        },
        "color": "#4E8C6E",
    },
    "moon": {
        "id": "moon",
        "name": "Moon",
        "symbol": "\U0001F319",
        "type": "Natural satellite of Earth",
        "description": (
            "Earth's only natural satellite and the fifth largest moon in the "
            "Solar System. Formed about 4.5 billion years ago, most likely from "
            "debris after a Mars-sized body collided with the early Earth. It is "
            "tidally locked, so one hemisphere always faces Earth. The near side "
            "is dominated by dark basaltic maria; the far side is more heavily "
            "cratered."
        ),
        "physical": {
            "mean_diameter_km": 3474,
            "mass_kg": "7.342 × 10²²",
            "surface_gravity_ms2": 1.62,
            "escape_velocity_km_s": 2.38,
            "mean_distance_earth_km": 384400,
            "orbital_period_days": 27.3,
            "rotation_period_days": 27.3,
            "surface_temp_c": "≈ −173 °C (night) to ≈ 127 °C (day)",
            "atmosphere": "Extremely thin exosphere; effectively vacuum",
            "albedo": "≈ 0.12",
        },
        "color": "#C9821A",
    },
    "mars": {
        "id": "mars",
        "name": "Mars",
        "symbol": "\U0001F7E4",
        "type": "Terrestrial planet",
        "description": (
            "The fourth planet from the Sun, known as the Red Planet because of "
            "iron oxide on its surface. Home to Olympus Mons (the largest volcano "
            "in the Solar System) and Valles Marineris. It has two small moons, "
            "Phobos and Deimos, both discovered by Asaph Hall in 1877. Water ice "
            "exists at the poles and likely below the surface."
        ),
        "physical": {
            "mean_diameter_km": 6779,
            "mass_kg": "6.39 × 10²³",
            "surface_gravity_ms2": 3.72,
            "escape_velocity_km_s": 5.03,
            "mean_distance_sun_au": 1.52,
            "orbital_period_days": 687,
            "rotation_period_hours": 24.6,
            "axial_tilt_deg": 25.19,
            "surface_temp_c": "≈ −125 °C to ≈ 20 °C",
            "atmosphere": "95.3 % CO₂, 2.7 % N₂, 1.6 % Ar; pressure ≈ 0.6 kPa",
            "natural_satellites": 2,
        },
        "color": "#F08080",
    },
    "jupiter": {
        "id": "jupiter",
        "name": "Jupiter",
        "symbol": "\U0001F7E2",
        "type": "Gas giant",
        "description": (
            "The fifth planet from the Sun and the largest in the Solar System. "
            "A gas giant of hydrogen and helium with no solid surface. Its Great "
            "Red Spot is a centuries-old anticyclonic storm. It has at least 95 "
            "known moons, including the four large Galilean satellites."
        ),
        "physical": {
            "mean_diameter_km": 139820,
            "mass_kg": "1.898 × 10²⁷",
            "surface_gravity_ms2": 24.79,
            "escape_velocity_km_s": 59.5,
            "mean_distance_sun_au": 5.2,
            "orbital_period_years": 11.86,
            "rotation_period_hours": 9.93,
            "axial_tilt_deg": 3.13,
            "surface_temp_c": "≈ −145 °C (cloud tops)",
            "atmosphere": "H₂ ~90 %, He ~10 %, trace methane, water, ammonia",
            "natural_satellites": 95,
        },
        "color": "#D8CA9D",
    },
    "saturn": {
        "id": "saturn",
        "name": "Saturn",
        "symbol": "\u2644",
        "type": "Gas giant",
        "description": (
            "The sixth planet from the Sun, famous for its extensive ring system "
            "of ice and rock particles. A gas giant with a low density — it would "
            "float in water if a large enough ocean existed. Titan, its largest "
            "moon, has a thick nitrogen atmosphere and liquid methane lakes."
        ),
        "physical": {
            "mean_diameter_km": 116460,
            "mass_kg": "5.683 × 10²⁶",
            "surface_gravity_ms2": 10.44,
            "escape_velocity_km_s": 35.5,
            "mean_distance_sun_au": 9.58,
            "orbital_period_years": 29.46,
            "rotation_period_hours": 10.7,
            "axial_tilt_deg": 26.73,
            "surface_temp_c": "≈ −178 °C (cloud tops)",
            "atmosphere": "H₂ ~96 %, He ~3 %, trace methane",
            "natural_satellites": 146,
        },
        "color": "#F4D03F",
    },
}

MOONS: dict[str, dict[str, Any]] = {
    "phobos": {
        "id": "phobos",
        "name": "Phobos",
        "symbol": "\U0001F5FF",
        "parent": "Mars",
        "type": "Irregular moon",
        "description": (
            "The larger and innermost of Mars' two moons, discovered by Asaph "
            "Hall in 1877. One of the smallest moons in the Solar System and the "
            "closest moon to its planet. It orbits faster than Mars rotates, so it "
            "rises in the west and sets in the east. Stickney Crater, nearly half "
            "the moon's width, dominates its surface. It is spiraling inward and "
            "will either impact Mars or break up into a ring in 30–50 million "
            "years."
        ),
        "physical": {
            "mean_diameter_km": "≈ 22.5",
            "mass_kg": "≈ 1.07 × 10¹⁶",
            "surface_gravity_ms2": "≈ 0.0057",
            "mean_density_g_cm3": "≈ 1.88",
            "albedo": "≈ 0.071",
            "shape": "Irregular, non-spherical, heavily cratered",
            "orbit_km": "≈ 9376 km from Mars center",
            "orbital_period_hours": "≈ 7.66",
        },
        "color": "#7F8C8D",
    },
    "deimos": {
        "id": "deimos",
        "name": "Deimos",
        "symbol": "\U0001F5FF",
        "parent": "Mars",
        "type": "Irregular moon",
        "description": (
            "The smaller and outermost of Mars' two moons, also discovered by "
            "Asaph Hall in 1877. Its surface is smoother than Phobos's because "
            "craters are partially buried by a thick blanket of regolith. It orbits "
            "almost exactly in Mars' equatorial plane on a near-circular path and "
            "is slowly spiraling outward."
        ),
        "physical": {
            "mean_diameter_km": "≈ 12.4",
            "mass_kg": "≈ 1.48 × 10¹⁵",
            "surface_gravity_ms2": "≈ 0.003",
            "mean_density_g_cm3": "≈ 1.75",
            "albedo": "≈ 0.07",
            "shape": "Irregular, non-spherical",
            "orbit_km": "≈ 23463 km from Mars center",
            "orbital_period_hours": "≈ 30.3",
        },
        "color": "#95A5A6",
    },
}

# --------------------------------------------------------------------------- #
# Diverse terrain candidate sites across all bodies (not single landing bases)
# --------------------------------------------------------------------------- #

SITES: dict[str, dict[str, Any]] = {
    # ---------------- Earth ----------------
    "mcmurdo": {
        "id": "mcmurdo",
        "name": "McMurdo Dry Valleys",
        "body": "Earth",
        "region": "Antarctica",
        "lat": -77.6,
        "lng": 162.2,
        "area_km2": 250.242,
        "mean_rough_m": 2.294,
        "p95_rough_m": 3.865,
        "max_rough_m": 6.256,
        "similarity_pct": 93,
        "siteClass": "strong polar site",
        "description": (
            "Extreme polar desert with minimal biology and permafrost soils. The "
            "most studied Mars site on Earth; cold, dry, and wind-scoured."
        ),
        "color": "#4E8C6E",
        "has_weather": True,
    },
    "axel_heiberg": {
        "id": "axel_heiberg",
        "name": "Axel Heiberg Island",
        "body": "Earth",
        "region": "Canadian Arctic",
        "lat": 79.4,
        "lng": -90.0,
        "area_km2": 81.175,
        "mean_rough_m": 2.232,
        "p95_rough_m": 3.611,
        "max_rough_m": 5.371,
        "similarity_pct": 91,
        "siteClass": "strong polar site",
        "description": (
            "Canadian High Arctic island with freeze-thaw cycles, exposed bedrock, "
            "and fossil forests. An accessible northern polar site for icy moon "
            "and polar crater exploration."
        ),
        "color": "#2E7D9A",
        "has_weather": True,
    },
    "kerguelen": {
        "id": "kerguelen",
        "name": "Kerguelen Islands",
        "body": "Earth",
        "region": "Southern Indian Ocean",
        "lat": -49.35,
        "lng": 69.35,
        "area_km2": 1.241,
        "mean_rough_m": 1.352,
        "p95_rough_m": 3.946,
        "max_rough_m": 6.782,
        "similarity_pct": 55,
        "siteClass": "weak site",
        "description": (
            "Volcanic basalt highlands in the isolated southern Indian Ocean. "
            "Tests the 'unexpected site' hypothesis — rough volcanic terrain "
            "contrasts with the polar sites."
        ),
        "color": "#E07A5F",
        "has_weather": True,
    },
    "atacama": {
        "id": "atacama",
        "name": "Atacama Desert",
        "body": "Earth",
        "region": "Chile",
        "lat": -24.0,
        "lng": -69.0,
        "area_km2": 140.0,
        "mean_rough_m": 1.875,
        "p95_rough_m": 3.410,
        "max_rough_m": 5.920,
        "similarity_pct": 82,
        "siteClass": "arid site",
        "description": (
            "One of the driest non-polar deserts on Earth, with high UV flux and "
            "saline soils. A leading site for hyper-arid Martian surface "
            "conditions and astrobiology drilling campaigns."
        ),
        "color": "#D4A017",
        "has_weather": True,
    },
    "iceland": {
        "id": "iceland",
        "name": "Iceland Highlands",
        "body": "Earth",
        "region": "Iceland",
        "lat": 64.5,
        "lng": -18.0,
        "area_km2": 95.0,
        "mean_rough_m": 2.650,
        "p95_rough_m": 4.080,
        "max_rough_m": 6.940,
        "similarity_pct": 78,
        "siteClass": "volcanic site",
        "description": (
            "Young basaltic lava fields, hydrothermal areas, and glacial outwash "
            "plains. An active volcanic site for Mars and lunar mare terrain."
        ),
        "color": "#34495E",
        "has_weather": True,
    },
    "death_valley": {
        "id": "death_valley",
        "name": "Death Valley",
        "body": "Earth",
        "region": "California, USA",
        "lat": 36.5,
        "lng": -117.0,
        "area_km2": 78.0,
        "mean_rough_m": 1.540,
        "p95_rough_m": 2.890,
        "max_rough_m": 4.320,
        "similarity_pct": 68,
        "siteClass": "arid site",
        "description": (
            "Hot, arid basin-and-range terrain with salt pans and alluvial fans. "
            "A Mars-site testbed for rover mobility and thermal extremes."
        ),
        "color": "#B7950B",
        "has_weather": True,
    },
    # ---------------- Moon ----------------
    "shackleton": {
        "id": "shackleton",
        "name": "Lunar South Pole (Shackleton)",
        "body": "Moon",
        "region": "South Pole",
        "lat": -89.9,
        "lng": 0.0,
        "area_km2": 3.875,
        "mean_rough_m": 2.462,
        "p95_rough_m": 4.138,
        "max_rough_m": 7.775,
        "similarity_pct": 100,
        "siteClass": "lunar baseline",
        "description": (
            "Permanently shadowed crater floor with nearby peaks of eternal light. "
            "Prime candidate for water-ice harvesting and sustained lunar presence."
        ),
        "color": "#C9821A",
        "has_weather": False,
    },
    "tycho": {
        "id": "tycho",
        "name": "Tycho Crater",
        "body": "Moon",
        "region": "Southern near side",
        "lat": -43.4,
        "lng": 11.2,
        "area_km2": 12.5,
        "mean_rough_m": 3.120,
        "p95_rough_m": 5.480,
        "max_rough_m": 9.210,
        "similarity_pct": 72,
        "siteClass": "young impact site",
        "description": (
            "A young, prominent impact crater with bright rays and a steep central "
            "peak. Rough ejecta blanket makes it a hazard-rich landing reference."
        ),
        "color": "#B07CC6",
        "has_weather": False,
    },
    "maris": {
        "id": "maris",
        "name": "Mare Serenitatis",
        "body": "Moon",
        "region": "Near side",
        "lat": 26.0,
        "lng": 18.0,
        "area_km2": 45.0,
        "mean_rough_m": 1.890,
        "p95_rough_m": 3.210,
        "max_rough_m": 5.430,
        "similarity_pct": 85,
        "siteClass": "mare site",
        "description": (
            "A broad, dark basaltic mare (lunar 'sea') formed by ancient lava "
            "flows. Relatively smooth, relatively young mare terrain suitable for "
            "rover traverses."
        ),
        "color": "#4A5568",
        "has_weather": False,
    },
    "apennines": {
        "id": "apennines",
        "name": "Montes Apenninus",
        "body": "Moon",
        "region": "Near side",
        "lat": 20.0,
        "lng": -3.5,
        "area_km2": 8.0,
        "mean_rough_m": 4.340,
        "p95_rough_m": 7.120,
        "max_rough_m": 11.800,
        "similarity_pct": 58,
        "siteClass": "highland site",
        "description": (
            "Rugged lunar mountain range forming the southeastern rim of Mare "
            "Imbrium. Steep slopes and shadowed valleys — a highland site for "
            "challenging terrain."
        ),
        "color": "#7F8C8D",
        "has_weather": False,
    },
    # ---------------- Mars ----------------
    "jezero": {
        "id": "jezero",
        "name": "Jezero Crater",
        "body": "Mars",
        "region": "Western Isidis Planitia",
        "lat": 18.4,
        "lng": 77.6,
        "area_km2": 506.277,
        "mean_rough_m": 2.110,
        "p95_rough_m": 3.744,
        "max_rough_m": 7.600,
        "similarity_pct": 86,
        "siteClass": "martian reference",
        "description": (
            "Perseverance's landing region — an ancient delta fan and lakebed. A "
            "benchmark for Martian terrain and the search for past microbial life."
        ),
        "color": "#F08080",
        "has_weather": False,
    },
    "gusev": {
        "id": "gusev",
        "name": "Gusev Crater",
        "body": "Mars",
        "region": "Southern hemisphere",
        "lat": -14.6,
        "lng": 175.5,
        "area_km2": 210.0,
        "mean_rough_m": 2.780,
        "p95_rough_m": 4.520,
        "max_rough_m": 7.310,
        "similarity_pct": 81,
        "siteClass": "lakebed site",
        "description": (
            "Spirit rover's landing site — a crater that may once have held a "
            "lake. Sedimentary deposits and volcanic plains make it a diverse "
            "geological site."
        ),
        "color": "#C0392B",
        "has_weather": False,
    },
    "gale": {
        "id": "gale",
        "name": "Gale Crater",
        "body": "Mars",
        "region": "Near equator",
        "lat": -4.6,
        "lng": 137.4,
        "area_km2": 300.0,
        "mean_rough_m": 2.450,
        "p95_rough_m": 3.980,
        "max_rough_m": 6.890,
        "similarity_pct": 84,
        "siteClass": "mound site",
        "description": (
            "Curiosity rover's landing site, dominated by Mount Sharp (Aeolis "
            "Mons), a layered sedimentary mound preserving a record of Mars' "
            "environmental history."
        ),
        "color": "#D35400",
        "has_weather": False,
    },
    "eos_chasma": {
        "id": "eos_chasma",
        "name": "Eos Chasma",
        "body": "Mars",
        "region": "Valles Marineris",
        "lat": -12.0,
        "lng": 315.0,
        "area_km2": 180.0,
        "mean_rough_m": 3.910,
        "p95_rough_m": 6.230,
        "max_rough_m": 10.450,
        "similarity_pct": 62,
        "siteClass": "canyon site",
        "description": (
            "A large canyon in the Valles Marineris system. Steep walls, landslide "
            "deposits, and layered strata — a challenging, deep-canyon site."
        ),
        "color": "#7D3C98",
        "has_weather": False,
    },
    "hellas": {
        "id": "hellas",
        "name": "Hellas Planitia",
        "body": "Mars",
        "region": "Southern hemisphere",
        "lat": -43.0,
        "lng": 70.0,
        "area_km2": 600.0,
        "mean_rough_m": 1.760,
        "p95_rough_m": 2.940,
        "max_rough_m": 4.820,
        "similarity_pct": 89,
        "siteClass": "impact basin site",
        "description": (
            "One of the largest impact basins in the Solar System. Its floor is "
            "the lowest elevation on Mars and may host seasonal frost and dust "
            "devils."
        ),
        "color": "#8E44AD",
        "has_weather": False,
    },
}

# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #


def get_planet(body_id: str) -> dict[str, Any] | None:
    return PLANETS.get(body_id)


def get_moon(moon_id: str) -> dict[str, Any] | None:
    return MOONS.get(moon_id)


def get_site(site_id: str) -> dict[str, Any] | None:
    return SITES.get(site_id)


def list_planets() -> list[dict[str, Any]]:
    return list(PLANETS.values())


def list_moons() -> list[dict[str, Any]]:
    return list(MOONS.values())


def list_sites(body: str | None = None) -> list[dict[str, Any]]:
    sites = list(SITES.values())
    if body is not None:
        sites = [s for s in sites if s["body"].lower() == body.lower()]
    return sites


def encyclopedia_payload() -> dict[str, Any]:
    return {
        "planets": list_planets(),
        "moons": list_moons(),
        "sites": list_sites(),
    }
