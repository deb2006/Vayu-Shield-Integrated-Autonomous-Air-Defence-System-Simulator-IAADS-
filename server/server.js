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

const SYSTEM_CONFIGS = {
  'Akash': { range: 45, capacity: 4, reload: 45 },
  'MR-SAM': { range: 80, capacity: 4, reload: 45 },
  'S-400': { range: 400.0, capacity: 8, reload: 60 },
  'L-70 Gun': { range: 8.0, capacity: 50, reload: 10 },
  'EW Swarm Jammer': { range: 18.0, capacity: 100, reload: 5 },
  // Fighter Aircraft (Global/Regional Fallback - No range constraint)
  'Tejas': { range: 9999.0, capacity: 2, reload: 180 },
  'Rafale': { range: 9999.0, capacity: 2, reload: 240 },
  'Su-30MKI': { range: 9999.0, capacity: 2, reload: 300 },
  'MiG-29UPG': { range: 9999.0, capacity: 2, reload: 200 }
};

const defendersState = [];
airbases.forEach(base => {
  base.defenders.forEach(type => {
    const config = SYSTEM_CONFIGS[type];
    if (config) {
       // Multi-role fighter aircraft often operate in pairs (Section) or just 2 available slots
       const count = (config.capacity > 2 && type !== 'L-70 Gun' && type !== 'EW Swarm Jammer') ? 2 : 1;
       
       for (let i = 1; i <= count; i++) {
         defendersState.push({
           id: `${type.toUpperCase()}-${base.name.split(' ')[0].toUpperCase()}-${i}`,
           baseId: base.id,
           type: type,
           lat: base.lat,
           lon: base.lon,
           maxCapacity: config.capacity,
           readyMissiles: config.capacity,
           reloadTimer: 0,
           status: 'READY' // READY, RELOADING (or REFUELING)
         });
       }
    }
  });
});

// Cumulative Tactical Statistics
let tacticalStats = {
  interceptions: {}, // { 'S-400': 5, 'Akash': 3 }
  neutralized: {},   // { 'Fatah': 8, 'J-10': 2 }
  impacts: {},       // { 'bhuj': 1 }
  totalThreats: 0,
  startTime: Date.now()
};

function recordInterception(interceptorType, threatType) {
  tacticalStats.interceptions[interceptorType] = (tacticalStats.interceptions[interceptorType] || 0) + 1;
  tacticalStats.neutralized[threatType] = (tacticalStats.neutralized[threatType] || 0) + 1;
}

function recordImpact(baseId) {
  tacticalStats.impacts[baseId] = (tacticalStats.impacts[baseId] || 0) + 1;
}

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
    const response = await axios.post(`${AI_SERVICE_URL}/optimal-assignment`, {
      track: {
        id: track.id,
        type: track.type,
        latitude: track.lat,
        longitude: track.lon,
        velocity: track.velocity,
        altitude: track.altitude || 5000
      },
      defenders: defendersState.filter(d => d.status === 'READY')
    });

    if (response.data.assigned_defender) {
      const assigned = response.data.assigned_defender;
      
      // DOUBLE-LOCK SAFETY: Strictly block aircraft from engaging Fatahs (Doctrine enforcement)
      const isAircraft = ["Rafale", "Su-30MKI", "Tejas", "MiG-29UPG"].includes(assigned.type);
      if (track.type === 'Fatah' && isAircraft) {
         return; 
      }

      const launcher = defendersState.find(d => d.id === assigned.id);
      const config = SYSTEM_CONFIGS[launcher.type];
      
      if (launcher && launcher.readyMissiles > 0) {
           const isAircraft = ["Rafale", "Su-30MKI", "Tejas", "MiG-29UPG"].includes(launcher.type);
           const action = isAircraft ? 'SCRAMBLE' : 'LAUNCH';

           launcher.readyMissiles--;
           io.emit('event_log', {
             timestamp: new Date().toLocaleTimeString(),
             message: `[AUTO-${action}] ${launcher.type} (${launcher.id}) launched against ${track.type} (ID: ${track.id})`
           });

           if (launcher.readyMissiles <= 0) {
             launcher.status = 'RELOADING';
             launcher.reloadTimer = config.reload;
             io.emit('event_log', {
               timestamp: new Date().toLocaleTimeString(),
               message: `[BATTERY] ${launcher.type} (${launcher.id}) depleted. ${isAircraft ? 'Refueling' : 'Reloading'} for ${config.reload}s.`
             });
           }
        
        track.assignment = launcher;
        track.status = 'Engaged';
        
        const distDegrees = Math.sqrt(Math.pow(launcher.lat - track.lat, 2) + Math.pow(launcher.lon - track.lon, 2));
        const distKm = distDegrees * 111; 
        const velKmH = isAircraft ? 2200 : 4800; // SAMs are much faster than jets
        
        track.interceptCountdown = Math.ceil(distKm / (velKmH / 60));
        track.interceptCountdown = Math.max(3, Math.min(track.interceptCountdown, 20));
      }
    }
  } catch (err) {
    console.error('AI Assignment Error:', err.message);
  }
}

// Tactical Threat Spawner (Formations)
function launchDirectThreat(baseId, type) {
  // Always select a random target base to diversify the scenario
  const targetBase = airbases[Math.floor(Math.random() * airbases.length)];
  const targetBorderLon = 67.0 + (targetBase.lat - 23.0) * 0.6;
  const packageId = `TRK-${Date.now()}`;
  
  if (type === 'FIGHTER') {
    // Strike Package: 3 Fighters in V-formation
    for (let i = 0; i < 3; i++) {
      const latOffset = (i - 1) * 0.15; 
      const lonOffset = Math.abs(i - 1) * 0.1;
      const lat = targetBase.lat + (Math.random() * 1.4 - 0.7) + latOffset;
      const lon = targetBorderLon - (Math.random() * 1.2 + 0.8) - lonOffset;
      
      const rand = Math.random();
      let fType = rand < 0.3 ? 'J-10' : (rand < 0.6 ? 'F-16' : 'JF-17');
      const track = new Track(`${packageId}-F${i}`, fType, lat, lon, 950 + (Math.random()*300), 10000, targetBase);
      activeTracks.push(track);
    }
    io.emit('event_log', { 
      timestamp: new Date().toLocaleTimeString(),
      message: `[ALERT] Strike Package (3x Fighters) detected targeting ${targetBase.name}`
    });
  } else if (type === 'MISSILE') {
    // Missile Salvo: 4 Fatah Missiles in timed succession
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        const lat = targetBase.lat + (Math.random() * 2.5 - 1.25);
        const lon = targetBorderLon - (Math.random() * 2.0 + 1.5);
        const track = new Track(`${packageId}-M${i}`, 'Fatah', lat, lon, 5200 + (Math.random()*800), 15000, targetBase);
        activeTracks.push(track);
        io.emit('event_log', { 
          timestamp: new Date().toLocaleTimeString(),
          message: `[SALVO] Fatah Missile #${i+1} launched towards ${targetBase.name}`
        });
      }, i * 600); // 600ms launch window
    }
  } else if (type === 'DRONE') {
    // Drone Swarm: 5 Drones spread across the sector
    for (let i = 0; i < 5; i++) {
      const lat = targetBase.lat + (Math.random() * 1.0 - 0.5);
      const lon = targetBorderLon - (Math.random() * 0.4 + 0.6);
      const track = new Track(`${packageId}-S${i}`, 'Drone Swarm', lat, lon, 300 + (Math.random()*100), 2000, targetBase);
      activeTracks.push(track);
    }
    io.emit('event_log', { 
      timestamp: new Date().toLocaleTimeString(),
      message: `[ALERT] Drone Swarm (5x Units) detected targeting ${targetBase.name}`
    });
  }
}

// Simulation Interval
setInterval(() => {
  activeTracks.forEach(track => {
    if (track.status === 'Intercepted' && track.assignment) {
       recordInterception(track.assignment.type, track.type);
    } else if (track.status === 'Impacted' && track.target) {
       recordImpact(track.target.id);
    }
  });

  activeTracks = activeTracks.filter(t => t.status !== 'Impacted' && t.status !== 'Intercepted' && t.status !== 'Returning');
  
  activeTracks.forEach(track => {
    track.update();
    
    // Auto-assignment if not engaged
    if (!track.assignment && track.status !== 'Impacted') {
      autoAssignDefenders(track);
    }
  });

  // Update Launcher Reload Timers
  defendersState.forEach(launcher => {
    if (launcher.status === 'RELOADING' && launcher.reloadTimer > 0) {
       launcher.reloadTimer--;
       if (launcher.reloadTimer <= 0) {
          launcher.status = 'READY';
          launcher.readyMissiles = SYSTEM_CONFIGS[launcher.type].capacity;
          io.emit('event_log', { 
            timestamp: new Date().toLocaleTimeString(),
            message: `[BATTERY] ${launcher.type} (${launcher.id}) reload complete. Ready for engagement.`
          });
       }
    }
  });

  io.emit('track_update', activeTracks);
  io.emit('battery_update', defendersState);
}, SIMULATION_TICK_MS);

// API Routes
app.get('/bases', (req, res) => res.json(airbases));
app.post('/launch-package', (req, res) => {
  launchDirectThreat(req.body.baseId, req.body.type || 'FIGHTER');
  res.json({ status: 'Launched' });
});

app.get('/stats', (req, res) => {
  res.json({
    ...tacticalStats,
    duration: Math.floor((Date.now() - tacticalStats.startTime) / 1000)
  });
});

app.post('/stats/reset', (req, res) => {
  tacticalStats = {
    interceptions: {},
    neutralized: {},
    impacts: {},
    totalThreats: 0,
    startTime: Date.now()
  };
  res.json({ status: 'Reset Success' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`VayuShield Orchestration Server running on port ${PORT}`);
});
