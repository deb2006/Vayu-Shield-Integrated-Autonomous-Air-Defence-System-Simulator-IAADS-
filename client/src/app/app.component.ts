import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <div class="vayu-shield-root">
      <app-map></app-map>
      <app-dashboard></app-dashboard>
    </div>
  `,
  styles: [`
    .vayu-shield-root {
      position: relative;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      background: #000;
    }
  `]
})
export class AppComponent {
  title = 'VayuShield';
}
