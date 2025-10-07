import { Component, Input, WritableSignal, signal, computed, inject, Injectable } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';

/** Models */
type ID = number;
interface User { id: ID; handle: string; name: string; avatar?: string; bio?: string; }
interface Post { id: ID; userId: ID; text: string; createdAt: number; likeUserIds: ID[]; replyToId?: ID; repostOfId?: ID; }
interface Noti { id: ID; kind: 'like'|'reply'|'follow'; text: string; createdAt: number; }

/** Service (singleton) */
@Injectable({ providedIn: 'root' })
class ApiService {
  users: WritableSignal<User[]> = signal([
    { id:1, handle:'sarah',  name:'Sarah Clark',  avatar:'https://api.dicebear.com/9.x/thumbs/png?seed=One', bio:'Frontend + Sec' },
    { id:2, handle:'ashley', name:'Ashley Moon',  avatar:'https://api.dicebear.com/9.x/thumbs/png?seed=Two', bio:'Pilot & SAR' },
  ]);
  meId = 1;

  posts: WritableSignal<Post[]> = signal(this.load('posts', [
    { id:101, userId:1, text:'Hello TinyChirp 👋 #angular', createdAt:Date.now()-3600000, likeUserIds:[2] },
    { id:102, userId:2, text:'Angular + Tailwind, tiny but complete. #tailwind #angular', createdAt:Date.now()-180000, likeUserIds:[] },
  ]));

  bookmarks: WritableSignal<ID[]> = signal(this.load('bookmarks', [] as ID[]));
  notifications: WritableSignal<Noti[]> = signal(this.load('notifications', [
    { id:1, kind:'like', text:'Ashley liked your post', createdAt:Date.now()-600_000 },
    { id:2, kind:'follow', text:'Ashley followed you', createdAt:Date.now()-86_400_000 },
  ]));

  private save(key:string, value:any){ localStorage.setItem('tinychirp:'+key, JSON.stringify(value)); }
  private load<T>(key:string, fallback:T): T {
    try { const raw = localStorage.getItem('tinychirp:'+key); return raw? JSON.parse(raw) : fallback; } catch { return fallback; }
  }

  getUserByHandle(h:string){ return this.users().find(u=>u.handle===h); }
  getUser(id:ID){ return this.users().find(u=>u.id===id); }
  getPost(id:ID){ return this.posts().find(p=>p.id===id); }

  listFeed(): Post[] { return this.posts().filter(p=>!p.replyToId).slice().sort((a,b)=>b.createdAt-a.createdAt); }
  listPostsByUser(userId:ID): Post[] { return this.posts().filter(p=>p.userId===userId).slice().sort((a,b)=>b.createdAt-a.createdAt); } // <-- fixed below
  search(term:string): Post[] {
    const t = term.trim().toLowerCase();
    if(!t) return this.listFeed();
    return this.posts().filter(p=>{
      const u = this.getUser(p.userId);
      return p.text.toLowerCase().includes(t) || !!u && (u.name.toLowerCase().includes(t) || u.handle.toLowerCase().includes(t));
    }).sort((a,b)=>b.createdAt-a.createdAt);
  }

  createPost(text:string){
    const p: Post = { id: Date.now()+Math.floor(Math.random()*999), userId: this.meId, text: text.trim(), createdAt: Date.now(), likeUserIds: [] };
    this.posts.update(ps => { const next=[p, ...ps]; this.save('posts', next); return next; });
    this.recomputeTrends();
  }
  createReply(parentId:ID, text:string){
    const p: Post = { id: Date.now()+Math.floor(Math.random()*999), userId: this.meId, text: text.trim(), createdAt: Date.now(), likeUserIds: [], replyToId: parentId };
    this.posts.update(ps => { const next=[p, ...ps]; this.save('posts', next); return next; });
  }
  toggleRepost(postId:ID){
    const me = this.meId;
    const mine = this.posts().find(p => p.userId===me && p.repostOfId===postId);
    if (mine) { this.posts.update(ps => { const next=ps.filter(p=>p.id!==mine.id); this.save('posts',next); return next; }); return; }
    const rp: Post = { id: Date.now()+Math.floor(Math.random()*999), userId: me, text: '', createdAt: Date.now(), likeUserIds: [], repostOfId: postId };
    this.posts.update(ps => { const next=[rp, ...ps]; this.save('posts', next); return next; });
  }
  toggleLike(postId:ID){
    const me = this.meId;
    this.posts.update(ps => {
      const next = ps.map(p => p.id!==postId ? p : {
        ...p,
        likeUserIds: p.likeUserIds.includes(me) ? p.likeUserIds.filter(x=>x!==me) : [...p.likeUserIds, me]
      });
      this.save('posts', next); return next;
    });
  }
  toggleBookmark(postId:ID){
    this.bookmarks.update(bm=>{
      const has = bm.includes(postId);
      const next = has ? bm.filter(x=>x!==postId) : [postId, ...bm];
      this.save('bookmarks', next); return next;
    });
  }
  isBookmarked(postId:ID){ return this.bookmarks().includes(postId); }

  /** Trends (simple hashtag counter) */
  recomputeTrends(){
    const tags: Record<string, number> = {};
    for (const p of this.posts()){
      for (const m of p.text.matchAll(/#([a-z0-9_]+)/ig)){ const tag = m[1].toLowerCase(); tags[tag]=(tags[tag]||0)+1; }
    }
    const top = Object.entries(tags).map(([tag,count])=>({tag,count})).sort((a,b)=>b.count-a.count).slice(0,5);
    localStorage.setItem('tinychirp:trends', JSON.stringify(top));
  }
  constructor(){ this.recomputeTrends(); }
}

/** Shared: Post card */
@Component({
  standalone:true,
  selector:'app-post-card',
  imports:[CommonModule, RouterModule, FormsModule],
  template:`
  <article class="card dark:bg-neutral-900 dark:border-neutral-800">
    <header class="flex items-center gap-3 mb-2">
      <img [src]="user(post.userId)!.avatar" alt="" class="w-10 h-10 rounded-full object-cover">
      <a [routerLink]="['/u', user(post.userId)!.handle]" class="font-semibold hover:underline">
        {{ user(post.userId)!.name }}
      </a>
      <span class="text-gray-400 dark:text-neutral-400 text-sm ml-auto">{{post.createdAt | date:'short'}}</span>
    </header>

    <p *ngIf="displayPost().text" class="mb-3 whitespace-pre-line">{{ displayPost().text }}</p>
    <p *ngIf="post.repostOfId" class="text-xs text-gray-500 dark:text-neutral-400 -mt-2 mb-2">↻ Reposted</p>

    <footer class="flex flex-wrap items-center gap-2 text-sm">
      <button class="btn" (click)="like(displayPost().id)">♥ {{ displayPost().likeUserIds.length }}</button>
      <button class="btn" (click)="toggleReply()">💬 Reply</button>
      <button class="btn" (click)="repost(displayPost().id)">{{ isReposted() ? '↻ Undo' : '↻ Repost' }}</button>
      <button class="btn" (click)="bookmark(displayPost().id)">
        {{ api.isBookmarked(displayPost().id) ? '🔖 Bookmarked' : '🔖 Bookmark' }}
      </button>
    </footer>

    <form class="flex gap-2 pt-2" *ngIf="replyOpen" (ngSubmit)="sendReply(displayPost().id)">
      <input [(ngModel)]="draft" name="reply" maxlength="280" placeholder="Reply…" class="flex-1 rounded-xl border border-gray-300 dark:border-neutral-700 px-3 py-2 bg-white dark:bg-neutral-800" required />
      <button class="btn">Reply</button>
    </form>
  </article>
  `
})
export class PostCardComponent {
  @Input() post!: Post;
  api = inject(ApiService);
  me = this.api.meId;
  replyOpen = false;
  draft = '';

  user = (id:ID)=> this.api.getUser(id)!;
  displayPost = () => this.post.repostOfId ? this.api.getPost(this.post.repostOfId)! : this.post;

  /** Angular templates can’t use arrow functions inside bindings; move it to a method. */
  isReposted(): boolean {
    const id = this.displayPost().id;
    return this.api.posts().some(p => p.userId === this.me && p.repostOfId === id);
  }

  like(id:ID){ this.api.toggleLike(id); }
  repost(id:ID){ this.api.toggleRepost(id); }
  bookmark(id:ID){ this.api.toggleBookmark(id); }
  toggleReply(){ this.replyOpen = !this.replyOpen; }
  sendReply(parentId:ID){ if(!this.draft.trim()) return; this.api.createReply(parentId, this.draft.trim()); this.draft=''; this.replyOpen=false; }
}

/** Timeline / Feed */
@Component({
  standalone: true,
  selector: 'app-feed',
  imports: [CommonModule, FormsModule, PostCardComponent],
  template: `
  <section class="grid gap-4">
    <form (ngSubmit)="create()" class="card grid gap-3 dark:bg-neutral-900 dark:border-neutral-800">
      <label class="text-sm text-gray-500 dark:text-neutral-400">Compose</label>
      <div class="flex gap-3">
        <input [(ngModel)]="draft" name="draft" [maxLength]="280" placeholder="What's happening?"
               class="flex-1 rounded-xl border border-gray-300 dark:border-neutral-700 px-4 py-3 bg-white dark:bg-neutral-800" required />
        <button class="btn">Chirp</button>
      </div>
      <div class="text-right text-xs text-gray-500 dark:text-neutral-400">Characters left: {{ 280 - draft.length }}</div>
    </form>

    <div class="grid gap-3">
      <app-post-card *ngFor="let p of posts(); trackBy: track" [post]="p"></app-post-card>
    </div>
  </section>
  `
})
export class FeedPage {
  draft=''; private api = inject(ApiService);
  posts = computed(()=> this.api.listFeed());
  create(){ if(!this.draft.trim()) return; this.api.createPost(this.draft.trim()); this.draft=''; }
  track(_:number,p:Post){ return p.id; }
}

/** Profile */
@Component({
  standalone:true,
  selector:'app-profile',
  imports:[CommonModule, RouterModule, PostCardComponent],
  template:`
  <section class="grid gap-4" *ngIf="user() as u">
    <header class="card flex items-center gap-4 dark:bg-neutral-900 dark:border-neutral-800">
      <img [src]="u.avatar" class="w-16 h-16 rounded-full object-cover" alt="">
      <div>
        <h1 class="text-xl font-semibold">{{u.name}}</h1>
        <p class="text-gray-500 dark:text-neutral-400">@{{u.handle}}</p>
        <p class="mt-1 text-gray-700 dark:text-neutral-300">{{u.bio}}</p>
      </div>
    </header>

    <div class="grid gap-3">
      <app-post-card *ngFor="let p of posts()" [post]="p"></app-post-card>
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

/** Explore (search) */
@Component({
  standalone:true,
  selector:'app-explore',
  imports:[CommonModule, FormsModule, RouterModule, PostCardComponent],
  template:`
  <section class="grid gap-4">
    <form class="flex gap-2">
      <input [(ngModel)]="q" name="q" placeholder="Search posts or people…" class="flex-1 rounded-xl border border-gray-300 dark:border-neutral-700 px-4 py-2 bg-white dark:bg-neutral-800" />
      <button class="btn" (click)="apply($event)">Search</button>
    </form>

    <div class="grid gap-3" *ngIf="results().length; else empty">
      <app-post-card *ngFor="let p of results()" [post]="p"></app-post-card>
    </div>
    <ng-template #empty>
      <div class="text-gray-500 dark:text-neutral-400">Try searching for <span class="font-mono">#angular</span> or <span class="font-mono">#tailwind</span>.</div>
    </ng-template>
  </section>
  `
})
export class ExplorePage {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  q = this.route.snapshot.queryParamMap.get('q') || '';
  results = computed(()=> this.api.search(this.q));
  apply(e:Event){ e.preventDefault(); history.replaceState({},'',`/explore?q=${encodeURIComponent(this.q)}`); }
}

/** Notifications (mock) */
@Component({
  standalone:true,
  selector:'app-notifications',
  imports:[CommonModule],
  template:`
  <section class="grid gap-3">
    <article class="card dark:bg-neutral-900 dark:border-neutral-800" *ngFor="let n of notis()">
      <div class="text-sm text-gray-500 dark:text-neutral-400">{{n.createdAt | date:'short'}}</div>
      <div class="mt-1">{{n.kind | titlecase}} — {{n.text}}</div>
    </article>
  </section>
  `
})
export class NotificationsPage {
  api = inject(ApiService);
  notis = computed(()=> this.api.notifications().slice().sort((a,b)=>b.createdAt-a.createdAt));
}

/** Messages (placeholder) */
@Component({
  standalone:true,
  selector:'app-messages',
  imports:[CommonModule],
  template:`
  <section class="card dark:bg-neutral-900 dark:border-neutral-800">
    <h2 class="text-lg font-semibold mb-2">Messages</h2>
    <p class="text-gray-600 dark:text-neutral-300">Direct messages coming soon.</p>
  </section>
  `
})
export class MessagesPage {}

/** Bookmarks */
@Component({
  standalone:true,
  selector:'app-bookmarks',
  imports:[CommonModule, PostCardComponent],
  template:`
  <section class="grid gap-3">
    <h2 class="text-lg font-semibold">Bookmarks</h2>
    <ng-container *ngIf="items().length; else none">
      <app-post-card *ngFor="let p of items()" [post]="p"></app-post-card>
    </ng-container>
    <ng-template #none><div class="text-gray-500 dark:text-neutral-400">No bookmarks yet.</div></ng-template>
  </section>
  `
})
export class BookmarksPage {
  api = inject(ApiService);
  items = computed(()=> this.api.bookmarks().map(id=>this.api.getPost(id)!).filter(Boolean).sort((a,b)=>b.createdAt-a.createdAt));
}

/** Settings (profile + theme persisted) */
@Component({
  standalone:true,
  selector:'app-settings',
  imports:[CommonModule, FormsModule],
  template:`
  <form class="card grid gap-3 max-w-xl dark:bg-neutral-900 dark:border-neutral-800" (ngSubmit)="save()">
    <h2 class="text-lg font-semibold">Settings</h2>

    <label class="text-sm text-gray-500 dark:text-neutral-400">Display name</label>
    <input [(ngModel)]="name" name="name" class="rounded-xl border border-gray-300 dark:border-neutral-700 px-3 py-2 bg-white dark:bg-neutral-800" />

    <label class="text-sm text-gray-500 dark:text-neutral-400">Bio</label>
    <textarea [(ngModel)]="bio" name="bio" rows="3" class="rounded-xl border border-gray-300 dark:border-neutral-700 px-3 py-2 bg-white dark:bg-neutral-800"></textarea>

    <label class="text-sm text-gray-500 dark:text-neutral-400">Theme</label>
    <select [(ngModel)]="theme" name="theme" class="rounded-xl border border-gray-300 dark:border-neutral-700 px-3 py-2 bg-white dark:bg-neutral-800">
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>

    <div class="pt-2">
      <button class="btn">Save</button>
    </div>

    <div *ngIf="saved()" class="text-green-700 dark:text-green-400 text-sm">Saved ✓</div>
  </form>
  `
})
export class SettingsPage {
  private api = inject(ApiService);
  me = computed(()=> this.api.getUser(this.api.meId)!);
  name = this.me()?.name || '';
  bio  = this.me()?.bio  || '';
  theme = (localStorage.getItem('tinychirp:theme') || 'light');

  saved = signal(false);

  save(){
    const u = this.me();
    if (u){
      const next = {...u, name: this.name.trim() || u.name, bio: this.bio};
      const users = this.api.users().map(x=> x.id===u.id ? next : x);
      this.api.users.set(users);
      localStorage.setItem('tinychirp:users', JSON.stringify(users));
    }
    localStorage.setItem('tinychirp:theme', this.theme);
    document.documentElement.classList.toggle('dark', this.theme==='dark');

    this.saved.set(true);
    setTimeout(()=>this.saved.set(false), 1500);
  }
}

/** Dashboard (simple KPIs) */
@Component({
  standalone:true,
  selector:'app-dashboard',
  imports:[CommonModule],
  template:`
  <section class="grid gap-4">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="card dark:bg-neutral-900 dark:border-neutral-800"><div class="text-sm text-gray-500 dark:text-neutral-400">Posts</div><div class="text-2xl font-bold">{{posts()}}</div></div>
      <div class="card dark:bg-neutral-900 dark:border-neutral-800"><div class="text-sm text-gray-500 dark:text-neutral-400">Likes</div><div class="text-2xl font-bold">{{likes()}}</div></div>
      <div class="card dark:bg-neutral-900 dark:border-neutral-800"><div class="text-sm text-gray-500 dark:text-neutral-400">Bookmarks</div><div class="text-2xl font-bold">{{bookmarks()}}</div></div>
      <div class="card dark:bg-neutral-900 dark:border-neutral-800"><div class="text-sm text-gray-500 dark:text-neutral-400">Notifications</div><div class="text-2xl font-bold">{{notis()}}</div></div>
    </div>
    <div class="card dark:bg-neutral-900 dark:border-neutral-800">
      <h3 class="font-semibold mb-2">Recent activity</h3>
      <ul class="list-disc pl-6 space-y-1 text-sm">
        <li>Angular standalone + Signals + Tailwind + Router</li>
        <li>LocalStorage persistence (posts, bookmarks, theme, users)</li>
        <li>Explore search + hashtag trends</li>
      </ul>
    </div>
  </section>
  `
})
export class DashboardPage {
  api = inject(ApiService);
  posts = computed(()=> this.api.posts().length);
  likes = computed(()=> this.api.posts().reduce((n,p)=>n+p.likeUserIds.length,0));
  bookmarks = computed(()=> this.api.bookmarks().length);
  notis = computed(()=> this.api.notifications().length);
}
