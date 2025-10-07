import { Component } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FeedPage, ProfilePage } from './features';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule],
  template: `
    <main class="app-wrap">
      <div class="app-container">
        <router-outlet></router-outlet>
      </div>
    </main>
  `
})
export class AppComponent {}

export const routes: Routes = [
  { path: '', component: FeedPage, title: 'TinyChirp — Feed' },
  { path: 'u/:handle', component: ProfilePage, title: 'TinyChirp — Profile' },
  { path: '**', redirectTo: '' }
];
