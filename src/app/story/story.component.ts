import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { Router } from '@angular/router';

interface IntroPage { title: string; lines: string[]; }

/**
 * StoryComponent — a short, generic intro: a title card and a how-to-play card,
 * then into the game. No narrative/mythology — just what the player needs.
 */
@Component({
  selector: 'app-story',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="intro-wrapper">
      <div class="border-top">
        <span class="border-line"></span>
        <span class="border-glyph">◆</span>
        <span class="border-line"></span>
      </div>

      @if (page() === 0) {
        <div class="game-title">
          <div class="latin">DUSKFALL</div>
          <div class="subtitle">a top-down stealth run</div>
        </div>
      }

      <div class="chapter-title">{{ current().title }}</div>
      <div class="intro-body">
        @for (line of current().lines; track $index) {
          <div class="line">{{ line }}</div>
        }
      </div>

      <div class="nav-row">
        <div class="page-dots">
          @for (p of pages; track $index) {
            <span class="dot" [class.active]="$index === page()" (click)="page.set($index)"></span>
          }
        </div>
        <div class="nav-btns">
          @if (page() > 0) {
            <button class="btn-secondary" (click)="prev()">◄ BACK</button>
          }
          <button class="btn-primary" (click)="next()">
            {{ page() < pages.length - 1 ? 'CONTINUE ▶' : '▶ START' }}
          </button>
        </div>
      </div>

      <div class="border-bottom">
        <span class="page-counter">{{ page() + 1 }} / {{ pages.length }}</span>
      </div>
    </div>
  `,
  styles: [`
    .intro-wrapper {
      min-height: 100vh; background: var(--bg); display: flex; flex-direction: column;
      align-items: center; justify-content: center; padding: 32px 24px; gap: 24px;
      animation: fadeIn 0.6s ease; max-width: 620px; margin: 0 auto;
    }
    .border-top, .border-bottom { display: flex; align-items: center; gap: 10px; width: 100%; }
    .border-line { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, var(--fire-deep), transparent); }
    .border-glyph { font-size: 14px; color: var(--fire-dim); opacity: 0.7; }
    .game-title { text-align: center; }
    .latin {
      font-family: 'Cinzel', serif; font-size: 2.6rem; color: var(--fire);
      letter-spacing: 0.4em; animation: flameGlow 2.5s infinite;
    }
    .subtitle { font-size: 0.72rem; color: var(--fire-dim); letter-spacing: 0.3em; margin-top: 8px; }
    .chapter-title {
      font-family: 'Cinzel', serif; font-size: 1.4rem; color: var(--fire);
      letter-spacing: 0.25em; text-align: center; animation: flameGlow 2s infinite;
    }
    .intro-body {
      width: 100%; border-top: 1px solid var(--stone); border-bottom: 1px solid var(--stone);
      padding: 18px 8px; display: flex; flex-direction: column; gap: 10px;
    }
    .line { font-size: 0.9rem; color: #cc9944; line-height: 1.7; text-align: center; }
    .nav-row { display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 12px; }
    .page-dots { display: flex; gap: 8px; align-items: center; }
    .dot { width: 9px; height: 9px; border-radius: 50%; background: #1a0a00; cursor: pointer; border: 1px solid var(--stone); transition: all 0.2s; }
    .dot.active { background: var(--fire); border-color: var(--fire); box-shadow: 0 0 8px var(--fire-glow); }
    .nav-btns { display: flex; gap: 10px; }
    .btn-primary {
      background: none; border: 1px solid var(--fire); color: var(--fire); padding: 11px 24px;
      font-family: 'Cinzel', serif; font-size: 0.85rem; letter-spacing: 0.15em;
      text-shadow: 0 0 8px var(--fire-glow); transition: all 0.15s;
    }
    .btn-primary:hover { background: rgba(255,136,0,0.07); box-shadow: 0 0 18px var(--fire-glow); }
    .btn-secondary {
      background: none; border: 1px solid var(--stone); color: var(--fire-dim); padding: 11px 18px;
      font-family: 'Share Tech Mono', monospace; font-size: 0.8rem; transition: all 0.15s;
    }
    .btn-secondary:hover { border-color: var(--fire-dim); color: var(--fire); }
    .border-bottom { justify-content: center; }
    .page-counter { font-size: 0.65rem; color: #3a1a00; letter-spacing: 0.3em; }
    @media (max-width: 480px) {
      .latin { font-size: 1.8rem; letter-spacing: 0.2em; }
      .btn-primary { font-size: 0.75rem; padding: 9px 16px; }
    }
  `],
})
export class StoryComponent {
  readonly pages: IntroPage[] = [
    {
      title: 'THE RUN',
      lines: [
        'Ten glowing orbs are scattered across the ruins.',
        'Collect every one before the guards close in.',
        'Stay out of the firelight. Keep to the dark.',
      ],
    },
    {
      title: 'HOW TO PLAY',
      lines: [
        'WASD / Arrows — move',
        '[V]  SURGE — fast & forceful; stuns guards on contact, but you glow and are easy to spot',
        '[N]  CLOAK — near-invisible to the guards, but slow',
        'Both drain your ENERGY; standing in NORMAL refills it',
        '[C]  switch camera (third-person / top-down)',
        'Avoid the fires. Collect all 10 orbs to win.',
      ],
    },
  ];
  readonly page = signal(0);
  readonly current = computed(() => this.pages[this.page()]);

  constructor(private router: Router) {}

  next(): void {
    if (this.page() < this.pages.length - 1) this.page.update(p => p + 1);
    else this.router.navigate(['/game']);
  }
  prev(): void { if (this.page() > 0) this.page.update(p => p - 1); }
}
