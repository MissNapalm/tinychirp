import { Component, Input, WritableSignal, signal, computed, inject, Injectable } from '@angular/core';
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
