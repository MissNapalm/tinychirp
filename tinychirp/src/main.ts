import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AppComponent, routes } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes)]
}).catch(console.error);
