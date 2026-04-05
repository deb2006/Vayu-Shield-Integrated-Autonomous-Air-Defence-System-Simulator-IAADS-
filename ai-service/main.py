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
    "Fighter": ["S-400", "Su-30MKI", "Rafale", "Tejas", "MiG-29UPG"],
    "Missile": ["S-400", "Akash", "MR-SAM"],
    "CM-400": ["S-400", "Akash", "MR-SAM"],
    "Fatah": ["S-400", "Akash", "MR-SAM"],
    "Drone Swarm": ["EW Swarm Jammer", "L-70 Gun"]
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
    # Logic: Fighters usually high altitude, high speed. 
    # Missiles very high speed (Mach 2+). 
    # Drones lower speed, lower altitude.
    classification = "Unknown"
    
    if track.velocity > 1500: # Over 1500 km/h (~Mach 1.2)
        classification = "High-Speed Threat (Missile)"
    elif track.velocity > 600:
        classification = "Aerial Combatant (Fighter)"
    else:
        classification = "Low-Velocity Threat (Drone)"
    
    return {"track_id": track.id, "classification": classification}

@app.post("/evaluate")
async def evaluate_threat(track: Track, bases: List[Airbase]):
    # Calculate distance to nearest base and TTI (Time-to-Impact)
    threat_eval = []
    
    for base in bases:
        dist = haversine(track.latitude, track.longitude, base.latitude, base.longitude)
        tti = (dist / track.velocity) * 60 if track.velocity > 0 else float('inf') # TTI in minutes
        
        # Threat Score calculation
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
    
    # Sort by threat score descending
    threat_eval.sort(key=lambda x: x['threat_score'], reverse=True)
    return threat_eval

@app.post("/optimal-assignment")
async def get_optimal_assignment(track: Track, defenders: List[dict]):
    # defenders: [{"id": "S400-1", "type": "S-400", "lat": 23.5, "lon": 69.8}]
    
    allowed_systems = TARGETING_MATRIX.get(track.type, ["S-400"])
    
    # Filter candidates by type and enforce point-defense range constraints
    candidates = []
    for d in defenders:
        if d['type'] not in allowed_systems:
            continue
            
        dist = haversine(track.latitude, track.longitude, d['lat'], d['lon'])
        
        # L-70 Gun point-defense constraint: 8km
        if d['type'] == "L-70 Gun" and dist > 8.0:
            continue
            
        # EW Swarm Jammer range constraint: 18km
        if d['type'] == "EW Swarm Jammer" and dist > 18.0:
            continue
            
        candidates.append({"data": d, "dist": dist})
    
    if not candidates:
        return {"track_id": track.id, "assigned_defender": None, "reason": "No defenders in range or compatible"}
    
    # Prioritization logic:
    # 1. Type Priority (based on index in TARGETING_MATRIX)
    # 2. Distance
    def get_priority(cand):
        sys_type = cand['data']['type']
        try:
            return allowed_systems.index(sys_type)
        except ValueError:
            return 99
            
    candidates.sort(key=lambda x: (get_priority(x), x['dist']))
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
