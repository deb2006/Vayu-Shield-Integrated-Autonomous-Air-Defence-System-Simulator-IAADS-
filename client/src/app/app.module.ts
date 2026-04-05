import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { MapComponent } from './components/map/map.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ApiService } from './services/api.service';

@NgModule({
  declarations: [
    AppComponent,
    MapComponent,
    DashboardComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule
  ],
  providers: [ApiService],
  bootstrap: [AppComponent]
})
export class AppModule { }
