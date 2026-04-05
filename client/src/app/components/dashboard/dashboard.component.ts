import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-dashboard',
  template: `
    <div class="dashboard-container">
      <div class="status-indicator">
         <span [class.linked]="isLinked">● {{ isLinked ? 'LINKED' : 'OFFLINE' }}</span>
      </div>

      <div class="top-threat-panel panel-base">
         <h3>🚨 Top Threat Intensity</h3>
         <ul>
           <li *ngFor="let track of activeTracks | slice:0:5">
             <span [style.color]="track.type.includes('Missile') ? 'red' : 'yellow'">{{track.id}}</span> ➔ {{track.type}} ({{track.status}})
           </li>
         </ul>
      </div>

      <div class="bases-panel panel-base">
         <h3 style="margin: 0; cursor: pointer; display: flex; justify-content: space-between; align-items: center;" (click)="showAssets = !showAssets">
            <span>🛡️ Regional Assets</span>
            <span style="font-size: 0.8rem;">{{ showAssets ? '▼' : '▶' }}</span>
         </h3>
         <div *ngIf="showAssets" style="margin-top: 10px;">
            <div *ngFor="let base of bases" style="margin-bottom: 8px; font-size: 0.85rem;">
               <div style="font-weight: bold; color: #fff; border-bottom: 1px solid rgba(0,255,0,0.3); padding-bottom: 2px; margin-bottom: 2px;">{{ base.name }}</div>
               <div style="color: #aaa;">{{ base.defenders.join(', ') }}</div>
            </div>
         </div>
      </div>

      <div class="stats-panel panel-base">
        <h3>📊 Interception Stats</h3>
        <div class="stat-grid">
           <div class="stat-box">Impacted: {{stats.impacted}}</div>
           <div class="stat-box">Intercepted: {{stats.intercepted}}</div>
           <div class="stat-box" style="grid-column: span 2">Rate: {{stats.rate}}%</div>
        </div>
        <div style="margin-top: 10px; border-top: 1px dashed #0f0; padding-top: 10px;">
           <h4 style="margin: 0 0 5px 0; font-size: 0.9rem;">Kill Board</h4>
           <div style="font-size: 0.85rem; max-height: 80px; overflow-y: auto;">
             <div *ngFor="let stat of typeStats | keyvalue" style="display: flex; justify-content: space-between;">
                <span>{{ stat.key }}</span>
                <span>{{ stat.value }} kills</span>
             </div>
             <div *ngIf="(typeStats | keyvalue).length === 0" style="opacity: 0.5;">No kills registered.</div>
           </div>
        </div>
      </div>

      <div class="log-panel panel-base">
        <h3>📜 Tactical Feed</h3>
        <div #logContainer class="log-scroll">
           <div class="log-entry" *ngFor="let log of logs">
             [{{log.timestamp}}] {{log.message}}
           </div>
        </div>
      </div>

      <div class="control-panel panel-base">
         <h3>⚡ Force Command</h3>
         <div class="button-group">
           <button (click)="launchStrike('random', 'FIGHTER')">Launch Fighter Strike</button>
           <button (click)="launchStrike('random', 'MISSILE')">Launch Missile Strike</button>
           <button (click)="launchStrike('random', 'DRONE')">Launch Drone Swarm</button>
         </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      pointer-events: none;
      z-index: 1000;
      color: #0f0;
      font-family: 'Orbitron', 'Courier New', monospace;
    }
    
    .panel-base {
      position: absolute;
      pointer-events: auto;
      background: rgba(0, 20, 0, 0.8);
      border: 1px solid #0f0;
      padding: 15px;
      box-shadow: 0 0 15px rgba(0, 255, 0, 0.2);
    }

    .top-threat-panel { top: 20px; left: 20px; width: 330px; }
    .stats-panel { top: 80px; right: 20px; width: 330px; }
    .bases-panel { top: 80px; right: 370px; width: 250px; }
    .log-panel { bottom: 20px; left: 20px; width: 400px; height: 200px; }
    .control-panel { 
      bottom: 20px; left: 65%; transform: translateX(-35%); 
      width: 380px; text-align: center;
    }

    .log-panel { width: 450px; height: 200px; }
    .log-scroll { height: 150px; overflow-y: scroll; font-size: 0.85rem; }
    .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
    .stat-box { border: 1px solid #0f0; padding: 5px; text-align: center; }
    
    .status-indicator {
      position: fixed;
      top: 20px;
      right: 20px;
      font-size: 1.2rem;
      font-weight: bold;
    }
    .linked { color: #0f0; text-shadow: 0 0 10px #0f0; }
    .offline { color: #f00; }

    .button-group { 
      display: grid; grid-template-columns: 1fr 1fr; 
      gap: 8px; margin-bottom: 10px; 
    }

    button {
      background: #000; color: #0f0; border: 1px solid #0f0;
      padding: 8px 5px; margin: 0; cursor: pointer;
      font-family: inherit; font-size: 0.85rem; width: 100%;
    }
    button:hover { background: #0f0; color: #000; }
  `]
})
export class DashboardComponent implements OnInit {
  activeTracks: any[] = [];
  logs: any[] = [];
  stats = { impacted: 0, intercepted: 0, rate: 0 };
  seenImpacted = new Set<string>();
  interceptedTracker = new Map<string, string>();
  typeStats: { [key: string]: number } = {};
  isLinked = false;
  showAssets = false;
  bases: any[] = [];

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getBases().subscribe((data: any) => {
       this.bases = data;
    });
    this.api.onTrackUpdate().subscribe(tracks => {
       this.activeTracks = tracks.sort((a, b) => b.velocity - a.velocity);
       this.updateStats(tracks);
    });

    this.api.onEventLog().subscribe(log => {
       this.logs.unshift(log);
       if (this.logs.length > 50) this.logs.pop();
    });

    this.api.onConnectionStatus().subscribe(status => {
       this.isLinked = status;
    });
  }

  updateStats(tracks: any[]) {
     tracks.forEach(t => {
       if (t.status === 'Impacted') this.seenImpacted.add(t.id);
       if (t.status === 'Intercepted' && !this.interceptedTracker.has(t.id)) {
          this.interceptedTracker.set(t.id, t.type);
          if (!this.typeStats[t.type]) {
            this.typeStats[t.type] = 0;
          }
          this.typeStats[t.type]++;
       }
     });
     this.stats.impacted = this.seenImpacted.size;
     this.stats.intercepted = this.interceptedTracker.size;
     const total = this.stats.impacted + this.stats.intercepted;
     this.stats.rate = total > 0 ? Math.round((this.stats.intercepted / total) * 100) : 0;
  }

  launchStrike(baseId: string, type: string) {
     this.api.launchPackage(baseId, type).subscribe();
  }
}
