# VayuShield: Integrated Autonomous Air Defence System (IAADS) Simulator

VayuShield is a real-time, highly interactive tactical coordination and integrated defense simulation. It renders multi-domain threats across a scalable geographic engine and autonomously mitigates them using a sophisticated Python AI back-end to test and deploy interception doctrines without manual oversight.

## 🚀 Key Features

* **Real-time Tactical Map:** Angular-based tactical feed layered on Leaflet, providing a live, 60x-scaled physical overlay of active airspace.
* **Orchestration Engine (Node.js):** Runs an independent physics interval to calculate velocities, geographical paths, impacts, and intercept countdown timers on the fly.
* **Targeting AI Service (FastAPI):** Ingests incoming tracks and queries active regional defense arrays (S-400s, Akash, Rafales, Su-30MKI, Tejas). Selects the ideal interceptor using a strict targeting matrix tailored to counter specific threats (e.g., L-70 guns and EW Jammers uniquely mapped to drone swarms).
* **Live Action Kill Board:** Monitors high-velocity WebSocket events and maintains a robust client-side Map tracker to record interception metrics by specific vehicle type (e.g. Fatah, JF-17, CM-400) without relying on persistent database storage.
* **Decentralized SHORAD (SHort Range Air Defence):** Every airbase (Bhuj, Jaisalmer, Pathankot, and Srinagar) is equipped with a localized **EW Swarm Jammer** and **L-70 Gun** point-defense array. The AI strictly enforces engagement envelopes (18km for EW, 8km for L-70) to simulate realistic terminal defense doctrine. 
* **High-Speed Physics Engine:** Projectile velocities are calibrated to real-world Mach profiles, with the **CM-400AKG** cruise missile traversing at **Mach 4.7+** (~5800 km/h) and the **Fatah** at **Mach 1.0** (~1235 km/h). 

## 🧠 Advanced Autonomous Logic Modules

1. **Strategic Boundary Awareness (Dynamic Slant Calculation):**
Instead of simple box boundaries, hostile fighters use a dynamic geographical calculation (`68.0 + (lat - 23.0) * 0.54`) mapped to the real-world slant of the Indo-Pakistani border. Fighters deployed at different latitudes accurately recognize airspace thresholds, halting incursions and adopting random flight waypoints to patrol just outside the border limits, simulating an active standoff screen.

2. **Decentralized Spawning:** 
Targets autonomously scatter across the entirety of the tactical theater (from Bhuj in the south, up to Srinagar). Spawning architectures dynamically orient themselves directly across the mathematical border line relative to their targeted air base, ensuring realistic intercept geometries.

3. **Standoff Weapons Simulation (CM-400 / JF-17 link):**
Missile deployments dynamically scan airspace for active `JF-17` hostile tracks. If a fighter is present, the module evaluates the closest potential regional asset and natively spawns a high-speed `CM-400` from the exact coordinate envelope of the fighter—mirroring true air-launched cruise missile mechanics. If no platform is active, the engine defaults to geographically remote surface-launched ballistic tracks (`Fatah`).

## 🛠️ Stack
* **Frontend:** Angular 17.x, Leaflet, HTML/CSS
* **Orchestrator:** Node.js, Express, Socket.io
* **AI Evaluation Engine:** Python, FastAPI, Uvicorn

## 🚦 How to Run
1. Start the Orchestrator: `cd server && node server.js`
2. Start the AI Logic Engine: `cd ai-service && uvicorn main:app --host 0.0.0.0 --port 8000`
3. Launch UI: `cd client && ng serve`

Navigate to `http://localhost:4200` to dive into the theater command panel.
