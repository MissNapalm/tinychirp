import { Component, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, RouterOutlet, Routes } from '@angular/router';
import {
  FeedPage, ProfilePage, ExplorePage, NotificationsPage,
  MessagesPage, BookmarksPage, SettingsPage, DashboardPage
} from './features';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen grid grid-cols-12 dark:bg-neutral-900 dark:text-neutral-100">
      <!-- Sidebar -->
      <aside class="col-span-12 sm:col-span-3 lg:col-span-2 border-b sm:border-b-0 sm:border-r border-gray-200 dark:border-neutral-800 flex flex-col h-screen">
        <div class="flex-shrink-0 p-4">
          <a routerLink="/" class="text-2xl font-extrabold tracking-tight">🐦 TinyChirp</a>
        </div>
        <nav class="flex-1 overflow-y-auto px-2 pb-4 space-y-1 text-[15px]">
          <a routerLink="/dashboard" routerLinkActive="!bg-gray-100 dark:!bg-neutral-800"
             class="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-neutral-800">
            <span>🏠</span><span>Dashboard</span>
          </a>
          <a routerLink="/" routerLinkActive="!bg-gray-100 dark:!bg-neutral-800"
             class="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-neutral-800">
            <span>📰</span><span>Timeline</span>
          </a>
          <a routerLink="/explore" routerLinkActive="!bg-gray-100 dark:!bg-neutral-800"
             class="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-neutral-800">
            <span>🔎</span><span>Explore</span>
          </a>
          <a routerLink="/notifications" routerLinkActive="!bg-gray-100 dark:!bg-neutral-800"
             class="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-neutral-800">
            <span>🔔</span><span>Notifications</span>
          </a>
          <a routerLink="/messages" routerLinkActive="!bg-gray-100 dark:!bg-neutral-800"
             class="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-neutral-800">
            <span>💬</span><span>Messages</span>
          </a>
          <a routerLink="/bookmarks" routerLinkActive="!bg-gray-100 dark:!bg-neutral-800"
             class="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-neutral-800">
            <span>🔖</span><span>Bookmarks</span>
          </a>
          <a routerLink="/u/sarah" routerLinkActive="!bg-gray-100 dark:!bg-neutral-800"
             class="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-neutral-800">
            <span>👤</span><span>Profile</span>
          </a>
          <a routerLink="/settings" routerLinkActive="!bg-gray-100 dark:!bg-neutral-800"
             class="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-neutral-800">
            <span>⚙️</span><span>Settings</span>
          </a>
        </nav>
      </aside>

      <!-- Main -->
      <div class="col-span-12 sm:col-span-9 lg:col-span-7 flex flex-col h-screen">
        <header class="flex-shrink-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur border-b border-gray-200 dark:border-neutral-800">
          <div class="max-w-[820px] mx-auto px-4 py-3 flex items-center gap-3">
            <input [(ngModel)]="q" name="q" placeholder="Search posts & users…"
                   class="flex-1 border border-gray-300 dark:border-neutral-700 rounded-xl px-4 py-2 bg-white dark:bg-neutral-800"
                   (keydown.enter)="goExplore()">
            <button class="px-3 py-2 rounded-xl border border-gray-300 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-800"
                    (click)="toggleTheme()">
              {{ theme() === 'dark' ? '🌙 Dark' : '☀️ Light' }}
            </button>
          </div>
        </header>
        <main class="flex-1 overflow-y-auto">
          <div class="max-w-[820px] mx-auto p-4">
            <router-outlet></router-outlet>
          </div>
        </main>
      </div>

      <!-- Right column / trends -->
      <aside class="hidden lg:block lg:col-span-3 border-l border-gray-200 dark:border-neutral-800 h-screen overflow-y-auto">
        <div class="p-4 sticky top-0 bg-white dark:bg-neutral-900">
          <h3 class="font-semibold mb-3">Trends</h3>
          <ul class="space-y-2">
            <li *ngFor="let t of topTrends()">
              <a [routerLink]="['/explore']" [queryParams]="{ q: '#'+t.tag }" class="text-blue-600 dark:text-blue-400 hover:underline">#{{t.tag}}</a>
              <span class="text-xs text-gray-500 dark:text-neutral-400"> · {{t.count}} posts</span>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  `,
})
export class AppComponent {
  q = '';
  theme = signal<'light'|'dark'>((localStorage.getItem('tinychirp:theme') as any) || 'light');

  constructor() {
    effect(() => {
      const v = this.theme();
      document.documentElement.classList.toggle('dark', v === 'dark');
      localStorage.setItem('tinychirp:theme', v);
    });
  }

  toggleTheme() { this.theme.update(t => t === 'dark' ? 'light' : 'dark'); }
  goExplore() { location.assign(`/explore?q=${encodeURIComponent(this.q)}`); }
  topTrends = () => JSON.parse(localStorage.getItem('tinychirp:trends') || '[]');
}

export const routes: Routes = [
  { path: '', component: FeedPage, title: 'Timeline' },
  { path: 'dashboard', component: DashboardPage, title: 'Dashboard' },
  { path: 'explore', component: ExplorePage, title: 'Explore' },
  { path: 'notifications', component: NotificationsPage, title: 'Notifications' },
  { path: 'messages', component: MessagesPage, title: 'Messages' },
  { path: 'bookmarks', component: BookmarksPage, title: 'Bookmarks' },
  { path: 'u/:handle', component: ProfilePage, title: 'Profile' },
  { path: 'settings', component: SettingsPage, title: 'Settings' },
  { path: '**', redirectTo: '' },
];
