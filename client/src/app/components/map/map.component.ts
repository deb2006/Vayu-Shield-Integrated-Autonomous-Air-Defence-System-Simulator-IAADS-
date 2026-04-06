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

    /* Pulsing animation for EW range circles */
    ::ng-deep .pulse-blue {
      animation: pulse-animation-blue 3s infinite;
    }

    @keyframes pulse-animation-blue {
      0% { stroke-opacity: 0.8; fill-opacity: 0.1; stroke-width: 1; }
      50% { stroke-opacity: 0.4; fill-opacity: 0.3; stroke-width: 3; }
      100% { stroke-opacity: 0.8; fill-opacity: 0.1; stroke-width: 1; }
    }

    /* Tooltip styling enhancements */
    ::ng-deep .leaflet-tooltip {
      background: rgba(0, 0, 0, 0.8) !important;
      color: #0f0 !important;
      border: 1px solid #0f0 !important;
      font-family: 'Orbitron', sans-serif !important;
      font-size: 0.75rem !important;
    }
  `]
})
export class MapComponent implements OnInit, AfterViewInit, OnDestroy {
  private map!: L.Map;
  private trackLayer!: L.LayerGroup;
  private rangeLayerGroup = L.layerGroup();
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
    const RANGE_STYLES: { [type: string]: any } = {
      'S-400': { radius: 400000, color: '#0f0', opacity: 0.1, dash: '10, 10' },
      'MR-SAM': { radius: 80000, color: '#ff0', opacity: 0.3, weight: 2 },
      'Akash': { radius: 45000, color: '#ff0', opacity: 0.5, weight: 1.5 },
      'EW Swarm Jammer': { radius: 18000, color: '#00f', opacity: 0.4, className: 'pulse-blue' },
      'L-70 Gun': { radius: 8000, color: '#f00', opacity: 0.6, weight: 2 }
    };

    this.api.getBases().subscribe(bases => {
      bases.forEach((base: any) => {
        // Base Marker
        const marker = L.circleMarker([base.lat, base.lon], {
          radius: 8,
          color: '#00ccff',
          fillColor: '#00ccff',
          fillOpacity: 0.9,
          weight: 2
        }).bindTooltip(`<b>${base.name}</b><br>${base.role}`, { permanent: true, direction: 'right' });
        
        marker.addTo(this.map);
        this.baseMarkers[base.id] = marker;

        // Specialized Coverage Rings
        base.defenders.forEach((type: string) => {
           const style = RANGE_STYLES[type];
           if (style) {
             L.circle([base.lat, base.lon], {
               radius: style.radius,
               color: style.color,
               fillColor: style.color,
               fillOpacity: style.opacity,
               weight: style.weight || 1,
               dashArray: style.dash || '',
               className: style.className || '',
               interactive: true // Allow tooltip on rings
             }).bindTooltip(`${type} Range: ${style.radius / 1000}km`, { sticky: true })
               .addTo(this.rangeLayerGroup);
           }
        });
      });
    });

    this.api.showRanges$.subscribe(show => {
      if (show) {
        this.rangeLayerGroup.addTo(this.map);
      } else {
        this.rangeLayerGroup.remove();
      }
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
