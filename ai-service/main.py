from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import math

app = FastAPI(title="VayuShield AI-Service")

class Track(BaseModel):
    id: str
    type: str  # Fighter, Missile, Drone
    latitude: float
    longitude: float
    velocity: float
    altitude: float
    target_base: Optional[str] = None

class Airbase(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float

# Constants for Targeting Matrix
TARGETING_MATRIX = {
    "Fighter": ["S-400", "Su-30MKI", "Rafale", "Tejas", "MiG-29UPG", "MR-SAM", "Akash"],
    "F-16": ["S-400", "Su-30MKI", "Rafale", "Tejas", "MiG-29UPG", "MR-SAM", "Akash"],
    "J-10": ["S-400", "Su-30MKI", "Rafale", "Tejas", "MiG-29UPG", "MR-SAM", "Akash"],
    "JF-17": ["S-400", "Su-30MKI", "Rafale", "Tejas", "MiG-29UPG", "MR-SAM", "Akash"],
    "Missile": ["S-400", "Akash", "MR-SAM"],
    "Fatah": ["Akash", "MR-SAM", "S-400"],
    "Drone Swarm": ["EW Swarm Jammer", "L-70 Gun", "Akash"]
}

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * \
        math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

@app.post("/classify")
async def classify_track(track: Track):
    classification = "Unknown"
    if track.velocity > 1500: classification = "High-Speed Threat (Missile)"
    elif track.velocity > 600: classification = "Aerial Combatant (Fighter)"
    else: classification = "Low-Velocity Threat (Drone)"
    return {"track_id": track.id, "classification": classification}

@app.post("/evaluate")
async def evaluate_threat(track: Track, bases: List[Airbase]):
    threat_eval = []
    for base in bases:
        dist = haversine(track.latitude, track.longitude, base.latitude, base.longitude)
        tti = (dist / track.velocity) * 60 if track.velocity > 0 else float('inf')
        score = 0
        if dist < 50: score += 50
        elif dist < 150: score += 20
        if tti < 5: score += 30
        elif tti < 15: score += 10
        threat_eval.append({
            "base_name": base.name,
            "distance_km": round(dist, 2),
            "tti_min": round(tti, 2),
            "threat_score": score
        })
    threat_eval.sort(key=lambda x: x['threat_score'], reverse=True)
    return threat_eval

@app.post("/optimal-assignment")
async def get_optimal_assignment(track: Track, defenders: List[dict]):
    # Tactical Priority Matrix (Lower is Higher Priority)
    PRIORITY_MATRIX = {
        "Fatah": {"Akash": 1.0, "MR-SAM": 1.5, "S-400": 10.0, "L-70 Gun": 20.0},
        "Drone Swarm": {"EW Swarm Jammer": 1.0, "L-70 Gun": 2.0, "Akash": 10.0},
        "J-10": {"S-400": 1.0, "MR-SAM": 2.0, "Rafale": 5.0, "Su-30MKI": 5.0, "Tejas": 5.0, "MiG-29UPG": 5.0, "Akash": 10.0},
        "F-16": {"S-400": 1.0, "MR-SAM": 2.0, "Rafale": 5.0, "Su-30MKI": 5.0, "Tejas": 5.0, "MiG-29UPG": 5.0, "Akash": 10.0},
        "JF-17": {"S-400": 1.0, "MR-SAM": 2.0, "Rafale": 5.0, "Su-30MKI": 5.0, "Tejas": 5.0, "MiG-29UPG": 5.0, "Akash": 10.0},
    }

    allowed_systems = TARGETING_MATRIX.get(track.type, ["S-400"])
    candidates = []
    for d in defenders:
        if d['type'] not in allowed_systems:
            continue
            
        dist = haversine(track.latitude, track.longitude, d['lat'], d['lon'])
        
        # Enforce System Range Constraints
        if d['type'] == "Akash" and dist > 45.0: continue
        if d['type'] == "MR-SAM" and dist > 80.0: continue
        if d['type'] == "S-400" and dist > 400.0: continue
        if d['type'] == "L-70 Gun" and dist > 8.0: continue
        if d['type'] == "EW Swarm Jammer" and dist > 18.0: continue

        # Calculate Priority Score (Target Type Priority * distance)
        threat_priorities = PRIORITY_MATRIX.get(track.type, {})
        weight = threat_priorities.get(d['type'], 5.0)
        
        score = dist * weight
        # readyMissiles is used for load balancing (prefer launcher with more ammo if scores are similar)
        ammo = d.get('readyMissiles', 0)
        candidates.append({"data": d, "dist": dist, "score": score, "ammo": ammo})
    
    if not candidates:
        return {"assigned_defender": None}
    
    # Sort by: 1. Tactical Score, 2. Ammunition (Higher ammo first for load balancing)
    candidates.sort(key=lambda x: (x['score'], -x['ammo']))
    best = candidates[0]
            
    return {
        "track_id": track.id,
        "assigned_defender": best['data'],
        "distance": round(best['dist'], 2),
        "mode": "Full-Auto"
    }

@app.get("/health")
async def health():
    return {"status": "AI Service Online"}
