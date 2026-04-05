const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Tactical Data & Simplified Border
const BORDER_POINTS = [
  { lat: 23.63, lon: 68.16 },
  { lat: 26.50, lon: 71.00 },
  { lat: 30.00, lon: 73.50 },
  { lat: 35.00, lon: 75.00 }
];

const airbases = [
  { id: 'bhuj', name: 'Bhuj Airbase', lat: 23.2875, lon: 69.6701, role: 'Western Entry', defenders: ['S-400', 'Tejas', 'L-70 Gun', 'Akash', 'EW Swarm Jammer'] },
  { id: 'jaisalmer', name: 'Jaisalmer Airbase', lat: 26.8890, lon: 70.8647, role: 'Desert Sector', defenders: ['Akash', 'MR-SAM', 'Rafale', 'EW Swarm Jammer'] },
  { id: 'pathankot', name: 'Pathankot Airbase', lat: 32.2331, lon: 75.6347, role: 'Northern Strike', defenders: ['S-400', 'Su-30MKI', 'Akash', 'EW Swarm Jammer'] },
  { id: 'srinagar', name: 'Srinagar Airbase', lat: 33.9870, lon: 74.7741, role: 'High-altitude', defenders: ['Akash', 'MiG-29UPG', 'L-70 Gun', 'EW Swarm Jammer'] }
];

let activeTracks = [];
const SIMULATION_TICK_MS = 1000;

// Track Class
class Track {
  constructor(id, type, lat, lon, vel, alt, target) {
    this.id = id;
    this.type = type;
    this.lat = lat;
    this.lon = lon;
    this.velocity = vel; // km/h
    this.altitude = alt; // meters
    this.target = target;
    this.status = 'Detected';
    this.assignment = null;
    this.interceptCountdown = -1;
  }

  update() {
    // 1 Degree Lat ~ 111 km
    // 1 Degree Lon ~ 111 * cos(lat)
    // MULTIPLIED BY 60 for 60x Time Scale so the user actually sees movement
    const distPerTick = (this.velocity / 3600) * (SIMULATION_TICK_MS / 1000) * 60; // km per tick
    
    // Interception logic
    if (this.status === 'Engaged' && this.interceptCountdown > 0) {
      this.interceptCountdown--;
      if (this.interceptCountdown <= 0) {
        this.status = 'Intercepted';
        return; 
      }
    }
    
    // Move towards target
    if (this.target) {
      const dLat = this.target.lat - this.lat;
      const dLon = this.target.lon - this.lon;
      const distance = Math.sqrt(dLat * dLat + dLon * dLon);
      const angle = Math.atan2(dLat, dLon);

      // Boundary Check for Fighters (Strategic Containment)
      const isFighter = ['J-10', 'F-16', 'JF-17', 'Mirage V'].includes(this.type);
      if (isFighter) {
        // Dynamic Border Calculation (Angled from SW to NE)
        const borderThreshold = 67.0 + (this.lat - 23.0) * 0.6; 
        if (this.lon > borderThreshold && dLon > 0) {
           this.target = { 
              lat: this.lat + (Math.random()*2 - 1), 
              lon: borderThreshold - (Math.random()*1.5 + 0.5) 
           };
        }
      }

      // 111km per degree approximation
      this.lat += (distPerTick / 111) * Math.sin(angle);
      this.lon += (distPerTick / (111 * Math.cos(this.lat * (Math.PI / 180)))) * Math.cos(angle);
      
      // Hit detection (simplified)
      if (distance < 0.05) { 
        if (isFighter) {
          const tacticalBorder = 67.0 + (this.lat - 23.0) * 0.6;
          if (this.lon < tacticalBorder) {
             // Reached patrol waypoint, pick a new one
             this.target = { 
                lat: this.lat + (Math.random()*2 - 1), 
                lon: tacticalBorder - (Math.random()*1.5 + 0.5) 
             };
          } else {
             this.status = 'Impacted';
          }
        } else {
          this.status = 'Impacted';
        }
      }
    }
  }
}

// Full-Auto Logic
async function autoAssignDefenders(track) {
  try {
    const defenders = [
      { id: 'S400-PKT', type: 'S-400', lat: 31.0, lon: 74.5 },
      { id: 'S400-BHUJ', type: 'S-400', lat: 23.3, lon: 70.0 },
      { id: 'RAFALE-1', type: 'Rafale', lat: 28.0, lon: 72.0 },
      { id: 'RAFALE-2', type: 'Rafale', lat: 27.5, lon: 71.5 },
      { id: 'SU30-PKT', type: 'Su-30MKI', lat: 32.0, lon: 75.0 },
      { id: 'SU30-SXR', type: 'Su-30MKI', lat: 33.5, lon: 74.0 },
      { id: 'TEJAS-BHUJ', type: 'Tejas', lat: 23.3, lon: 69.6 },
      { id: 'AKASH-BHUJ', type: 'Akash', lat: 23.5, lon: 69.8 },
      { id: 'AKASH-JSR', type: 'Akash', lat: 26.9, lon: 70.8 },
      { id: 'AKASH-SXR', type: 'Akash', lat: 34.0, lon: 74.8 },
      { id: 'L70-JSR', type: 'L-70 Gun', lat: 26.8, lon: 70.8 },
      { id: 'L70-SXR', type: 'L-70 Gun', lat: 33.98, lon: 74.77 },
      { id: 'EW-BHUJ', type: 'EW Swarm Jammer', lat: 23.28, lon: 69.67 },
      { id: 'EW-JSR', type: 'EW Swarm Jammer', lat: 26.88, lon: 70.86 },
      { id: 'EW-PKT', type: 'EW Swarm Jammer', lat: 32.23, lon: 75.63 },
      { id: 'EW-SXR', type: 'EW Swarm Jammer', lat: 33.98, lon: 74.77 }
    ];

    const response = await axios.post(`${AI_SERVICE_URL}/optimal-assignment`, {
      track: {
        id: track.id,
        type: track.type,
        latitude: track.lat,
        longitude: track.lon,
        velocity: track.velocity,
        altitude: this.altitude || 5000
      },
      defenders: defenders
    });

    if (response.data.assigned_defender) {
      track.assignment = response.data.assigned_defender;
      track.status = 'Engaged';
      
      // Calculate Dynamic Time to Impact
      const def = response.data.assigned_defender;
      const isAircraft = ['Rafale', 'Su-30MKI', 'Tejas', 'MiG-29UPG'].includes(def.type);
      const velKmH = isAircraft ? 2200 : 4800; // SAMs are much faster than jets
      
      const distDegrees = Math.sqrt(Math.pow(def.lat - track.lat, 2) + Math.pow(def.lon - track.lon, 2));
      const distKm = distDegrees * 111; 
      
      // Simulation at 60x scale: 1 tick = 60 simulation seconds
      // Ticks = Distance(km) / (Velocity(km/h) / 60)
      track.interceptCountdown = Math.ceil(distKm / (velKmH / 60));
      
      // Safety cap: minimum 3 seconds, max 20 seconds for UI realism
      track.interceptCountdown = Math.max(3, Math.min(track.interceptCountdown, 20));
      io.emit('event_log', { 
        timestamp: new Date().toLocaleTimeString(),
        message: `[AUTO-ENGAGE] ${response.data.assigned_defender.type} launched against ${track.type} (ID: ${track.id})`
      });
    }
  } catch (err) {
    console.error('AI Assignment Error:', err.message);
  }
}

// Tactical Threat Spawner (Standalone)
function launchDirectThreat(baseId, type) {
  // Randomly select a target base regardless of input
  const targetBase = airbases[Math.floor(Math.random() * airbases.length)];
  const packageId = `TRK-${Date.now()}`;
  
  // Calculate dynamic border for the target base roughly
  const targetBorderLon = 67.0 + (targetBase.lat - 23.0) * 0.6;
  
  let track;
  if (type === 'FIGHTER') {
    const rand = Math.random();
    let fType = 'JF-17'; 
    if (rand < 0.05) fType = 'Mirage V';
    else if (rand < 0.25) fType = 'J-10';
    else if (rand < 0.60) fType = 'F-16';
    else fType = 'JF-17';
    const lat = targetBase.lat + (Math.random() * 2 - 1);
    const lon = targetBorderLon - (Math.random() * 1.5 + 0.5);
    track = new Track(`${packageId}-F`, fType, lat, lon, 900 + (Math.random()*400), 10000, targetBase);
  } else if (type === 'MISSILE') {
    const activeJF17s = activeTracks.filter(t => t.type === 'JF-17');
    if (activeJF17s.length > 0 && Math.random() > 0.4) {
      // CM-400 Air-Launched from an active JF-17
      const jf17 = activeJF17s[Math.floor(Math.random() * activeJF17s.length)];
      
      track = new Track(`${packageId}-M`, 'CM-400', jf17.lat, jf17.lon, 5800, 15000, jf17.target);
    } else {
      // Standard Surface-To-Surface Fatah launch
      const lat = targetBase.lat + (Math.random() * 3 - 1.5);
      const lon = targetBorderLon - (Math.random() * 2.5 + 1.0);
      track = new Track(`${packageId}-M`, 'Fatah', lat, lon, 1235, 15000, targetBase);
    }
  } else {
    // Drons Swarm relative spawn
    const lat = targetBase.lat + (Math.random() * 1.5 - 0.75);
    const lon = targetBorderLon - 0.8; 
    track = new Track(`${packageId}-S`, 'Drone Swarm', lat, lon, 300, 2000, targetBase);
  }

  activeTracks.push(track);

  io.emit('event_log', { 
    timestamp: new Date().toLocaleTimeString(),
    message: `[ALERT] Standalone ${track.type} detected targeting ${track.target.name}`
  });
}

// Simulation Interval
setInterval(() => {
  activeTracks = activeTracks.filter(t => t.status !== 'Impacted' && t.status !== 'Intercepted' && t.status !== 'Returning');
  
  activeTracks.forEach(track => {
    track.update();
    
    // Auto-assignment if not engaged
    if (!track.assignment && track.status !== 'Impacted') {
      autoAssignDefenders(track);
    }
  });

  io.emit('track_update', activeTracks);
}, SIMULATION_TICK_MS);

// API Routes
app.get('/bases', (req, res) => res.json(airbases));
app.post('/launch-package', (req, res) => {
  launchDirectThreat(req.body.baseId, req.body.type || 'FIGHTER');
  res.json({ status: 'Launched' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`VayuShield Orchestration Server running on port ${PORT}`);
});
