# VayuShield: Integrated Autonomous Air Defence System (IAADS) Simulator

VayuShield is a high-fidelity, real-time tactical command and air defense simulation. It orchestrates multi-domain threats across a scalable geospatial engine and autonomously neutralizes them using a sophisticated Python-based AI Core. Designed for doctrinal testing, it supports complex interception matrices, tiered defensive layers, and comprehensive mission debriefing.

## 🌟 New Feature: Tactical Mission Debrief
The latest update introduces a **Command-Level Performance Reporting Suite**. Commanders can now access a real-time "Mission Debrief" overlay that provides:
*   **Total Kills & Neutralization Rate**: Cumulative stats for all threat types.
*   **Interceptor Effectiveness**: Deep-dive analytics on which system (S-400, MR-SAM, Akash, or Scrambled Jets) is performing best in the current tactical cycle.
*   **Base Integrity Scoring**: Dynamic health tracking of regional airbases (Bhuj, Jaisalmer, etc.) based on successful impacts.
*   **Mission Clock**: Precise tracking of tactical deployment duration.

## 🚀 Core Capabilities

*   **Integrated Defense Doctrine (Tiered AI)**: 
    *   **Fatah Defense**: Strictly prioritizes Akash (1.0) and MR-SAM (1.5) batteries, reserving S-400 (10.0) as a last-resort heavyweight fallback.
    *   **Aircraft Interception**: Prioritizes S-400 for standoff kills, with regional Interceptor Jets (Rafale, Su-30MKI, etc.) serving as a global scramble fallback if SAM arrays are depleted.
*   **Sortie & Refuel Management**: Interceptor aircraft now manage mission counts (2 sorties) before entering a mandatory 3-5 minute refueling/rearming cycle.
*   **Global Fallback Scramble**: Defending aircraft are no longer bound by regional range constraints, allowing them to scramble to any sector in the theater to provide a universal "catch-all" defense layer.
*   **Real-time Tactical Map**: Angular-based visualizer with active track telemetry, intercept countdowns, and toggleable defense envelopes.
*   **High-Speed Ballistic Physics**: Calibrated to real-world Mach profiles, with the **Fatah** ballistic missile and **JF-17** strike packages operating at hyper-accurate velocities.

## 🧠 Autonomous Logic Modules

1.  **Targeting Matrix (main.py)**: A weighted scoring engine that evaluates distance, threat type, and doctrine priority to ensure ammunition is used optimally.
2.  **Orchestration Engine (server.js)**: Handles the physics interval, collision detection, and battery state management (READY vs RELOADING).
3.  **Strategic Boundary Awareness**: Hostile fighters maintain a random standoff patrol pattern along the dynamic slant of the western border, simulating active airspace surveillance.

## 🛠️ Technology Stack
*   **Frontend:** Angular 17.x, Leaflet.js, Vanilla CSS
*   **Back-end Orchestrator:** Node.js, Express, Socket.io
*   **Tactical AI Core:** Python 3.x, FastAPI, Uvicorn

## 🚦 Deployment & Execution

> [!IMPORTANT]
> Ensure all three services are running concurrently for the simulation to function correctly.

### 1. AI Logic Engine
```bash
cd ai-service
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload --root-path /ai-service
```

### 2. Orchestration Server
```bash
cd server
node server.js
```

### 3. Tactical Dashboard
```bash
cd client
npm start -- --port 4201
```

Access the command panel at: **[http://localhost:4201/](http://localhost:4201/)**

---
*Developed for VayuShield Integrated Autonomous Air Defence System - v1.0.5*
