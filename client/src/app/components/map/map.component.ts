import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import * as L from 'leaflet';
import { ApiService } from '../../services/api.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-map',
  template: '<div id="map"></div>',
  styles: [`
    #map {
      height: 100vh;
      width: 100%;
      background: #111;
    }
  `]
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
  private map!: L.Map;
  private trackLayer!: L.LayerGroup;
  private baseMarkers: { [id: string]: L.CircleMarker } = {};

  constructor(private api: ApiService, private http: HttpClient) {}

  ngOnInit(): void {
    // keep ngOnInit lightweight; initialize DOM-dependent map in AfterViewInit
  }

  ngAfterViewInit(): void {
    try {
      this.initMap();
      this.loadBases();
      this.loadBorder();
      this.subscribeToTracks();
    } catch (err) {
      // Surface initialization errors clearly to the console for debugging
      console.error('MapComponent init error:', err);
      // Do not rethrow to allow the app to continue bootstrapping
    }
  }

  private initMap(): void {
    this.map = L.map('map', {
      center: [28.0, 72.0],
      zoom: 6,
      zoomControl: false,
      attributionControl: false
    });

    // Detailed Dark Tactical Base
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(this.map);

    this.trackLayer = L.layerGroup().addTo(this.map);
  }

  private loadBases(): void {
    this.api.getBases().subscribe(bases => {
      bases.forEach((base: any) => {
        const marker = L.circleMarker([base.lat, base.lon], {
          radius: 8,
          color: '#00f',
          fillColor: '#00ccff',
          fillOpacity: 0.8
        }).bindTooltip(`<b>${base.name}</b><br>${base.role}`, { permanent: true, direction: 'right' });
        
        marker.addTo(this.map);
        this.baseMarkers[base.id] = marker;
        
        // Sector Boundary
        L.circle([base.lat, base.lon], {
          radius: 50000, // 50km
          color: 'rgba(0, 0, 255, 0.2)',
          weight: 1
        }).addTo(this.map);
      });
    });
  }

  private loadBorder(): void {
     this.http.get('assets/border.json').subscribe((data: any) => {
        L.geoJSON(data, {
          style: {
            color: '#f00',
            weight: 3,
            dashArray: '5, 8'
          }
        }).addTo(this.map);
     });
  }

  private subscribeToTracks(): void {
    this.api.onTrackUpdate().subscribe(tracks => {
       this.trackLayer.clearLayers();
       tracks.forEach((track: any) => {
          let color = '#ff0'; // Default Fighter
          if (track.type.includes('Missile') || track.type === 'Fatah' || track.type === 'CM-400') color = '#f00';
          if (track.type === 'Drone Swarm') color = '#f0f';

          const marker = L.circleMarker([track.lat, track.lon], {
            radius: 5,
            color: color,
            fillColor: color,
            fillOpacity: 1
          }).addTo(this.trackLayer);

          marker.bindTooltip(`${track.type} [${track.id}]`, { direction: 'top' });

          // Interception Line if Assignment Exists
          if (track.assignment) {
             const def = track.assignment;
             L.polyline([[track.lat, track.lon], [def.lat, def.lon]], {
               color: '#0f0',
               weight: 2,
               dashArray: '4, 4'
             }).addTo(this.trackLayer);
          }
       });
    });
  }

  ngOnDestroy(): void {
    if (this.map) {
      try {
        this.map.remove();
      } catch (e) {
        // ignore errors during destroy
      }
    }
  }
}
