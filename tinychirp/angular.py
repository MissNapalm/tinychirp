#!/usr/bin/env python3
"""
Run this from your Angular app folder (where angular.json lives):

    python setup_tinychirp.py

Then follow the printed NEXT STEPS.
"""
import json, os, sys, shutil
from pathlib import Path

ROOT = Path.cwd()
ANGULAR_JSON = ROOT / "angular.json"
SRC = ROOT / "src"
APP = SRC / "app"

def die(msg):
    print(f"❌ {msg}")
    sys.exit(1)

def write(path: Path, content: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(f"✓ wrote {path.relative_to(ROOT)}")

def remove(path: Path):
    if path.exists():
        if path.is_dir():
            shutil.rmtree(path)
        else:
            path.unlink()
        print(f"— removed {path.relative_to(ROOT)}")

def patch_angular_json():
    if not ANGULAR_JSON.exists():
        die("angular.json not found. Run this script inside the Angular app folder.")

    # backup first
    backup = ANGULAR_JSON.with_suffix(".json.bak")
    shutil.copyfile(ANGULAR_JSON, backup)
    print(f"↺ backed up angular.json -> {backup.name}")

    data = json.loads(ANGULAR_JSON.read_text(encoding="utf-8"))

    # Find all "styles" arrays under projects.*.architect(build/test).options.styles and set to ["styles.css"]
    def set_styles(obj):
        if not isinstance(obj, dict): return
        if "architect" in obj:
            arch = obj["architect"]
            for key in ("build", "test"):
                if key in arch and "options" in arch[key]:
                    arch[key]["options"]["styles"] = ["styles.css"]
        for v in obj.values():
            if isinstance(v, dict):
                set_styles(v)

    set_styles(data.get("projects", {}))

    ANGULAR_JSON.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print("✓ updated angular.json styles -> [\"styles.css\"] (build & test)")

def main_ts():
    return """import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AppComponent, routes } from './app/app.component';

bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes)]
}).catch(console.error);
"""

def app_component_ts():
    return """import { Component } from '@angular/core';
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
"""

def features_ts():
    return """import { Component, Input, WritableSignal, signal, computed, inject, Injectable } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';

/** Models */
type ID = number;
interface User { id: ID; handle: string; name: string; avatar?: string; bio?: string; }
interface Post { id: ID; userId: ID; text: string; createdAt: number; likeUserIds: ID[]; }

/** Service (singleton) */
@Injectable({ providedIn: 'root' })
class ApiService {
  users: WritableSignal<User[]> = signal([
    { id:1, handle:'sarah',  name:'Sarah Clark',  avatar:'https://api.dicebear.com/9.x/thumbs/png?seed=One', bio:'Frontend + Sec' },
    { id:2, handle:'ashley', name:'Ashley',       avatar:'https://api.dicebear.com/9.x/thumbs/png?seed=Two', bio:'Pilot & SAR'   },
  ]);
  posts: WritableSignal<Post[]> = signal(this.load('posts', [
    { id:101, userId:1, text:'Hello TinyChirp 👋', createdAt:Date.now()-3600000, likeUserIds:[2] },
    { id:102, userId:2, text:'Angular + Tailwind working beautifully!', createdAt:Date.now()-180000, likeUserIds:[] },
  ]));
  meId = 1;

  private save(key:string, value:any){ localStorage.setItem('tinychirp:'+key, JSON.stringify(value)); }
  private load<T>(key:string, fallback:T): T {
    try { const raw = localStorage.getItem('tinychirp:'+key); return raw? JSON.parse(raw) : fallback; } catch { return fallback; }
  }

  listPosts(): Post[] { return [...this.posts()].sort((a,b)=>b.createdAt-a.createdAt); }
  listPostsByUser(userId:ID): Post[] { return this.listPosts().filter(p=>p.userId===userId); }
  getUserByHandle(h:string){ return this.users().find(u=>u.handle===h); }
  getUser(id:ID){ return this.users().find(u=>u.id===id); }

  createPost(text:string){
    const p: Post = { id: Date.now(), userId: this.meId, text: text.trim(), createdAt: Date.now(), likeUserIds: [] };
    this.posts.update(ps => { const next=[p, ...ps]; this.save('posts', next); return next; });
  }
  toggleLike(postId:ID){
    const me = this.meId;
    this.posts.update(ps => {
      const next = ps.map(p => p.id!==postId ? p : {
        ...p,
        likeUserIds: p.likeUserIds.includes(me) ? p.likeUserIds.filter(x=>x!==me) : [...p.likeUserIds, me]
      });
      this.save('posts', next);
      return next;
    });
  }
}

/** Shared UI: post card */
@Component({
  standalone:true,
  selector:'app-post-card',
  imports:[CommonModule, RouterModule],
  template:`
  <article class="card">
    <header class="flex items-center gap-3 mb-2">
      <img [src]="avatar" alt="" class="w-10 h-10 rounded-full">
      <a [routerLink]="['/u', handle]" class="font-semibold hover:underline">@{{handle}}</a>
      <span class="text-gray-400 text-sm ml-auto">{{createdAt | date:'shortTime'}}</span>
    </header>
    <p class="mb-3">{{text}}</p>
    <footer class="flex gap-3 text-sm">
      <button (click)="onLike()" class="btn">♥ {{likes}}</button>
      <a [routerLink]="['/u', handle]" class="text-blue-600 hover:underline">Profile</a>
    </footer>
  </article>
  `
})
export class PostCardComponent {
  @Input() postId!: ID;
  @Input() name!: string;
  @Input() handle!: string;
  @Input() avatar!: string;
  @Input() text!: string;
  @Input() createdAt!: number;
  @Input() likes!: number;

  private api = inject(ApiService);
  onLike(){ this.api.toggleLike(this.postId); }
}

/** Feed Page */
@Component({
  standalone: true,
  selector: 'app-feed',
  imports: [CommonModule, FormsModule, PostCardComponent],
  template: `
  <section class="space-y-6">
    <form (ngSubmit)="create()" class="flex gap-3">
      <input [(ngModel)]="draft" name="draft" placeholder="What's happening?" required
             class="flex-1 border border-gray-300 rounded-lg p-2" />
      <button class="btn-primary px-4 py-2 rounded-lg">Chirp</button>
    </form>

    <div class="space-y-4">
      <app-post-card *ngFor="let p of posts(); trackBy: track"
        [postId]="p.id"
        [name]="user(p.userId)?.name || 'Unknown'"
        [handle]="user(p.userId)?.handle || 'unknown'"
        [avatar]="user(p.userId)?.avatar || 'https://api.dicebear.com/9.x/thumbs/png?seed=One'"
        [text]="p.text"
        [createdAt]="p.createdAt"
        [likes]="p.likeUserIds.length">
      </app-post-card>
    </div>
  </section>
  `
})
export class FeedPage {
  draft=''; private api = inject(ApiService);
  posts = computed(()=> this.api.listPosts());
  user = (id:ID)=> this.api.getUser(id);
  create(){ if(!this.draft.trim()) return; this.api.createPost(this.draft.trim()); this.draft=''; }
  track(_:number,p:Post){ return p.id; }
}

/** Profile Page */
@Component({
  standalone:true,
  selector:'app-profile',
  imports:[CommonModule, RouterModule, PostCardComponent],
  template:`
  <section *ngIf="user() as u" class="space-y-4">
    <header class="flex items-center gap-4">
      <img [src]="u.avatar || 'https://api.dicebear.com/9.x/thumbs/png?seed=One'" class="w-14 h-14 rounded-full" alt="">
      <div>
        <h1 class="text-xl font-semibold">{{u.name}}</h1>
        <p class="muted">@{{u.handle}}</p>
        <p class="text-gray-600">{{u.bio}}</p>
      </div>
    </header>

    <div class="space-y-3 mt-4">
      <app-post-card *ngFor="let p of posts()"
        [postId]="p.id"
        [name]="u.name"
        [handle]="u.handle"
        [avatar]="u.avatar || 'https://api.dicebear.com/9.x/thumbs/png?seed=One'"
        [text]="p.text"
        [createdAt]="p.createdAt"
        [likes]="p.likeUserIds.length">
      </app-post-card>
    </div>
  </section>
  `
})
export class ProfilePage {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  user = signal( this.api.getUserByHandle(this.route.snapshot.params['handle']) || null );
  posts = computed(()=> this.user() ? this.api.listPostsByUser(this.user()!.id) : []);
}
"""

def styles_root():
    return """@tailwind base;
@tailwind components;
@tailwind utilities;

/* Layout & typography */
html, body { height: 100%; }

body {
  @apply bg-gray-50 text-gray-900 font-sans antialiased flex items-center justify-center;
  font-size: clamp(15px, 1vw + 12px, 18px);
}

/* Centering wrapper */
.app-wrap { @apply w-full min-h-screen flex items-center justify-center; }
.app-container { @apply w-full max-w-[680px] sm:max-w-[820px] p-6; }

/* Card styling */
.card { @apply bg-white rounded-2xl shadow border border-gray-200 p-6; }

/* Buttons */
.btn { @apply inline-flex items-center justify-center gap-1 px-4 py-2 rounded-lg border border-gray-300 bg-gray-100 hover:bg-gray-200 transition; }
.btn-primary { @apply bg-blue-600 text-white hover:bg-blue-700; }

/* Muted */
.muted { @apply text-gray-500; }
"""

def postcss_config_v3():
    return """module.exports = {
  plugins: [
    require('tailwindcss'),
    require('autoprefixer'),
  ],
};
"""

def tailwind_config():
    return """/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}", "./styles.css"],
  theme: { extend: {} },
  plugins: [],
};
"""

def run():
    # 0) sanity
    if not ANGULAR_JSON.exists():
        die("angular.json not found. cd into your Angular app folder, then run this script.")

    # 1) Tailwind files (v3 stable)
    write(ROOT / "styles.css", styles_root())
    write(ROOT / "postcss.config.js", postcss_config_v3())
    write(ROOT / "tailwind.config.js", tailwind_config())

    # 2) Update angular.json styles to root styles.css
    patch_angular_json()

    # 3) App files
    write(SRC / "main.ts", main_ts())
    write(APP / "app.component.ts", app_component_ts())
    write(APP / "features.ts", features_ts())

    # 4) Remove old template/css/routes if they exist
    remove(APP / "app.component.html")
    remove(APP / "app.component.css")
    remove(APP / "app.routes.ts")

    print("\n✅ Files written.\n")
    print("NEXT STEPS (copy/paste):")
    print("  ./node_modules/.bin/ng cache clean || true")
    print("  npm i -D tailwindcss@3.4.13 postcss@8 autoprefixer@10")
    print("  npm start   # or: ./node_modules/.bin/ng serve --open")

if __name__ == "__main__":
    run()