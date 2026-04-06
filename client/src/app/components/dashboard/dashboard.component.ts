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
          <div *ngIf="showAssets" style="margin-top: 10px; max-height: 400px; overflow-y: auto;">
             <div *ngFor="let base of bases" style="margin-bottom: 12px; font-size: 0.85rem;">
                <div style="font-weight: bold; color: #fff; border-bottom: 1px solid rgba(0,255,0,0.5); padding-bottom: 2px; margin-bottom: 5px;">{{ base.name }}</div>
                <div *ngFor="let battery of getBatteriesForBase(base.id)" style="margin-bottom: 4px; padding-left: 5px; border-left: 2px solid #0f0;">
                   <div style="display: flex; justify-content: space-between;">
                      <span [style.color]="battery.status === 'RELOADING' ? '#f00' : '#0f0'">{{battery.type}}</span>
                      <span>{{battery.readyMissiles}}/{{battery.maxCapacity}}</span>
                   </div>
                   <div *ngIf="battery.status === 'RELOADING'" style="font-size: 0.75rem; color: #f00;">
                      RELOADING... {{battery.reloadTimer}}s
                   </div>
                </div>
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
             <button (click)="launchStrike('random', 'FIGHTER')">Strike Package</button>
            <button (click)="launchStrike('random', 'MISSILE')">Missile Salvo</button>
            <button (click)="launchStrike('random', 'DRONE')">Drone Swarm</button>
             <button (click)="toggleRanges()" [style.background]="showRanges ? '#0f0' : '#000'" [style.color]="showRanges ? '#000' : '#0f0'">
                {{ showRanges ? 'Hiding Ranges' : 'Show Defense Ranges' }}
             </button>
          </div>
      </div>

      <div class="debrief-trigger-panel panel-base">
         <button (click)="openDebrief()" class="debrief-wide-btn">📑 TACTICAL MISSION PERFORMANCE REPORT</button>
      </div>

      <!-- Tactical Debrief Overlay -->
      <div class="debrief-overlay" *ngIf="showDebrief">
         <div class="debrief-modal">
            <div class="debrief-header">
               <h2>TACTICAL MISSION DEBRIEF - CONFIDENTIAL</h2>
               <button class="close-btn" (click)="showDebrief = false">✖</button>
            </div>
            
            <div class="debrief-kpis">
               <div class="kpi-card">
                  <span class="label">NEUTRALIZED</span>
                  <span class="value">{{ totalKills }}</span>
               </div>
               <div class="kpi-card">
                  <span class="label">BASE INTEGRITY</span>
                  <span class="value" [style.color]="integrityColor">{{ integrity }}%</span>
               </div>
               <div class="kpi-card">
                  <span class="label">MISSION TIME</span>
                  <span class="value">{{ formatTime(debriefData?.duration) }}</span>
               </div>
            </div>

            <div class="debrief-details">
               <div class="column">
                  <h3>🎯 Interceptor Effectiveness</h3>
                  <table class="debrief-table">
                     <thead><tr><th>System</th><th>Interceptions</th></tr></thead>
                     <tbody>
                        <tr *ngFor="let item of debriefData?.interceptions | keyvalue">
                           <td>{{ item.key }}</td>
                           <td>{{ item.value }}</td>
                        </tr>
                        <tr *ngIf="!(debriefData?.interceptions | keyvalue).length">
                           <td colspan="2" style="opacity: 0.5;">No active engagements recorded.</td>
                        </tr>
                     </tbody>
                  </table>
               </div>

               <div class="column">
                  <h3>💥 Damage Assessment</h3>
                  <table class="debrief-table">
                     <thead><tr><th>Location</th><th>Impacts</th><th>Status</th></tr></thead>
                     <tbody>
                        <tr *ngFor="let base of bases">
                           <td>{{ base.name }}</td>
                           <td>{{ debriefData?.impacts[base.id] || 0 }}</td>
                           <td [style.color]="(debriefData?.impacts[base.id] || 0) > 0 ? '#f00' : '#0f0'">
                              {{ (debriefData?.impacts[base.id] || 0) > 0 ? 'COMPROMISED' : 'SECURE' }}
                           </td>
                        </tr>
                     </tbody>
                  </table>
               </div>
            </div>

            <div class="debrief-footer">
               <button class="reset-btn" (click)="resetTacticalCycle()">RESET TACTICAL CYCLE</button>
               <p style="font-size: 0.7rem; opacity: 0.5; margin-top: 10px;">Generated by VayuShield Integrated Autonomous Air Defence System - v1.0.4</p>
            </div>
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
    .stats-panel { top: 20px; right: 20px; width: 350px; }
    .bases-panel { top: 20px; right: 380px; width: 300px; }
    .log-panel { bottom: 20px; left: 20px; width: 400px; height: 200px; }
    .control-panel { 
      top: 420px; right: 20px; 
      width: 350px; text-align: center;
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
      z-index: 2100;
    }
    .linked { color: #0f0; text-shadow: 0 0 10px #0f0; }
    .offline { color: #f00; }

    .debrief-trigger-panel {
       top: 360px; right: 20px; width: 350px;
       padding: 10px !important; text-align: center;
       background: rgba(0,40,0,0.6);
    }
    .debrief-wide-btn {
       background: #003300; color: #0f0; border: 1px solid #0f0;
       padding: 10px; cursor: pointer; font-family: inherit; font-size: 0.8rem;
       width: 100%; font-weight: bold; box-shadow: 0 0 10px rgba(0,255,0,0.2);
    }
    .debrief-wide-btn:hover { background: #0f0; color: #000; }

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

    /* Debrief Overlay */
    .debrief-overlay {
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.85);
      backdrop-filter: blur(8px);
      display: flex; justify-content: center; align-items: center;
      z-index: 2000; pointer-events: auto;
    }
    .debrief-modal {
      width: 800px; max-height: 90vh;
      background: #000; border: 2px solid #0f0;
      padding: 30px; box-shadow: 0 0 50px rgba(0, 255, 0, 0.3);
      position: relative; overflow-y: auto;
    }
    .debrief-header {
      display: flex; justify-content: space-between; align-items: center;
      border-bottom: 2px solid #0f0; padding-bottom: 15px; margin-bottom: 25px;
    }
    .debrief-header h2 { margin: 0; font-size: 1.5rem; letter-spacing: 2px; }
    .close-btn { width: 40px; background: transparent; border: none; font-size: 1.5rem; }
    
    .debrief-kpis {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;
      margin-bottom: 30px;
    }
    .kpi-card {
      border: 1px solid #0f0; padding: 15px; text-align: center;
      background: rgba(0,255,0,0.05);
    }
    .kpi-card .label { display: block; font-size: 0.8rem; margin-bottom: 10px; opacity: 0.7; }
    .kpi-card .value { font-size: 2rem; font-weight: bold; }

    .debrief-details { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
    .debrief-details h3 { font-size: 1rem; border-left: 4px solid #0f0; padding-left: 10px; margin-bottom: 15px; }

    .debrief-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .debrief-table th { text-align: left; padding: 8px; border-bottom: 1px solid rgba(0,255,0,0.3); opacity: 0.6; }
    .debrief-table td { padding: 10px 8px; border-bottom: 1px solid rgba(0,255,0,0.1); }

    .debrief-footer { margin-top: 40px; text-align: center; border-top: 1px solid rgba(0,255,0,0.3); padding-top: 20px; }
    .reset-btn { 
      background: #330000; border-color: #f00; color: #f00; 
      padding: 12px 30px; font-weight: bold; width: auto;
    }
    .reset-btn:hover { background: #f00; color: #000; }
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
  showAssets = true;
  showDebrief = false;
  debriefData: any = null;
  bases: any[] = [];
  batteries: any[] = [];
  showRanges = false;

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getBases().subscribe((data: any) => {
       this.bases = data;
    });
    this.api.onBatteryUpdate().subscribe(data => {
       this.batteries = data;
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

    this.api.showRanges$.subscribe(val => {
       this.showRanges = val;
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

   getBatteriesForBase(baseId: string) {
      return this.batteries.filter(b => b.baseId === baseId);
   }

   toggleRanges() {
      this.api.toggleRanges();
   }

   openDebrief() {
      this.api.getTacticalStats().subscribe(data => {
         this.debriefData = data;
         this.showDebrief = true;
      });
   }

   resetTacticalCycle() {
      this.api.resetStats().subscribe(() => {
         this.debriefData = null;
         this.showDebrief = false;
         this.seenImpacted.clear();
         this.interceptedTracker.clear();
         this.typeStats = {};
         this.stats = { impacted: 0, intercepted: 0, rate: 0 };
      });
   }

   get totalKills(): number {
      if (!this.debriefData) return 0;
      return Object.values(this.debriefData.interceptions || {}).reduce((a: any, b: any) => a + (b as number), 0) as number;
   }

   get integrity(): number {
      if (!this.debriefData) return 100;
      const totalImpacts = Object.values(this.debriefData.impacts || {}).reduce((a: any, b: any) => a + (b as number), 0) as number;
      if (totalImpacts === 0) return 100;
      // Heuristic: Loss of 5% integrity per impact
      return Math.max(0, 100 - (totalImpacts * 5));
   }

   get integrityColor(): string {
     const val = this.integrity;
     if (val > 90) return '#0f0';
     if (val > 60) return '#ff0';
     return '#f00';
   }

   formatTime(seconds: number): string {
      if (!seconds) return '00:00';
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}s`;
   }
}
