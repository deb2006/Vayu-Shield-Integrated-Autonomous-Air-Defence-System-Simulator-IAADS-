import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { io, Socket } from 'socket.io-client';

@Injectable()
export class ApiService {
  private socket: Socket;
  private backendUrl = 'http://localhost:3000';
  private showRangesSubject = new BehaviorSubject<boolean>(false);
  public showRanges$ = this.showRangesSubject.asObservable();

  constructor(private http: HttpClient) {
    try {
      this.socket = io(this.backendUrl);
    } catch (err) {
      console.error('ApiService: socket.io initialization failed', err);
      // Provide a minimal stub so rest of the app can still bootstrap.
      this.socket = {
        on: (_: string, __?: any) => {},
        connected: false
      } as unknown as Socket;
    }
  }

  getBases(): Observable<any> {
    return this.http.get(`${this.backendUrl}/bases`);
  }

  launchPackage(baseId: string, type: string = 'FIGHTER'): Observable<any> {
    return this.http.post(`${this.backendUrl}/launch-package`, { baseId, type });
  }

  getTacticalStats(): Observable<any> {
    return this.http.get(`${this.backendUrl}/stats`);
  }

  resetStats(): Observable<any> {
    return this.http.post(`${this.backendUrl}/stats/reset`, {});
  }

  onTrackUpdate(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('track_update', (data) => observer.next(data));
    });
  }

  onEventLog(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('event_log', (data) => observer.next(data));
    });
  }

  onConnectionStatus(): Observable<boolean> {
    return new Observable(observer => {
      this.socket.on('connect', () => observer.next(true));
      this.socket.on('disconnect', () => observer.next(false));
      // Initial status
      observer.next(this.socket.connected);
    });
  }

  onBatteryUpdate(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('battery_update', (data) => observer.next(data));
    });
  }

  toggleRanges(): void {
    this.showRangesSubject.next(!this.showRangesSubject.value);
  }
}
