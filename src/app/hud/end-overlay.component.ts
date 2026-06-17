import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GameStateService } from '../core/game-state.service';

/**
 * EndOverlayComponent — win / lose screen carrying the Dharma framing of the
 * original. The "score" the task refers to IS the rescue tally: how many Nagas
 * Takshaka pulled from the fire. Shown when `screen()` is WIN or OVER.
 */
@Component({
  selector: 'app-end-overlay',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (screen() === 'WIN') {
      <div class="overlay naga-theme">
        <div class="serpent-divider">⎯⎯⎯ ◆ ⎯⎯⎯</div>
        <div class="end-devanagari">RUN COMPLETE</div>
        <div class="end-latin naga-glow">ALL ORBS RECOVERED</div>
        <div class="end-itrans">{{ saved() }} / {{ total() }} collected</div>
        <div class="end-divider"></div>
        <div class="end-text">Every orb is yours.

You slip back out through the ruins,
unseen, before the guards ever close the ring.

The dark keeps its quiet.</div>
        <div class="end-btns">
          <button class="btn-end naga" (click)="restart()">PLAY AGAIN</button>
          <button class="btn-secondary" (click)="story()">MENU</button>
        </div>
      </div>
    }

    @if (screen() === 'OVER') {
      <div class="overlay fire-theme">
        <div class="serpent-divider">⎯⎯⎯ ◆ ⎯⎯⎯</div>
        <div class="end-devanagari">CAUGHT</div>
        <div class="end-latin fire-glow">GAME OVER</div>
        <div class="end-itrans">{{ saved() }} of {{ total() }} orbs recovered</div>
        <div class="end-divider"></div>
        <div class="end-text">The fire found you.

The guards sweep the ruins,
and the orbs you missed flicker out one by one.

Try again — quieter this time.</div>
        <div class="end-btns">
          <button class="btn-end fire" (click)="restart()">TRY AGAIN</button>
          <button class="btn-secondary" (click)="story()">MENU</button>
        </div>
      </div>
    }
  `,
  styles: [`
    .overlay {
      position: fixed; inset: 0; z-index: 20;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 14px; text-align: center; padding: 24px;
      background: radial-gradient(ellipse at center, rgba(8,4,2,0.86), rgba(3,2,1,0.97));
      animation: fadeIn 0.8s ease;
    }
    .serpent-divider { letter-spacing: 0.3em; color: var(--gold-dim); font-size: 0.8rem; }
    .end-devanagari { font-family: 'Cinzel', serif; font-size: 1rem; letter-spacing: 0.4em; color: #6a5230; }
    .end-latin { font-family: 'Cinzel', serif; font-size: 2.2rem; letter-spacing: 0.2em; }
    .naga-glow { color: var(--naga); animation: nagaGlow 2.5s infinite; }
    .fire-glow { color: var(--fire); animation: flameGlow 2.5s infinite; }
    .end-itrans { font-size: 0.75rem; color: #775533; font-style: italic; }
    .end-divider { width: 120px; height: 1px; background: var(--stone); margin: 6px 0; }
    .end-text { font-size: 0.85rem; color: #cc9944; line-height: 2; white-space: pre-wrap; max-width: 520px; }
    .end-btns { display: flex; gap: 12px; margin-top: 12px; }
    .btn-end {
      background: none; padding: 11px 26px; font-family: 'Cinzel', serif;
      font-size: 0.85rem; letter-spacing: 0.15em; transition: all 0.15s;
    }
    .btn-end.naga { border: 1px solid var(--naga); color: var(--naga); text-shadow: 0 0 8px var(--naga-glow); }
    .btn-end.naga:hover { background: rgba(68,136,255,0.08); box-shadow: 0 0 18px var(--naga-glow); }
    .btn-end.fire { border: 1px solid var(--fire); color: var(--fire); text-shadow: 0 0 8px var(--fire-glow); }
    .btn-end.fire:hover { background: rgba(255,136,0,0.08); box-shadow: 0 0 18px var(--fire-glow); }
    .btn-secondary {
      background: none; border: 1px solid var(--stone); color: var(--fire-dim);
      padding: 11px 18px; font-family: 'Share Tech Mono', monospace; font-size: 0.8rem;
    }
    .btn-secondary:hover { border-color: var(--fire-dim); color: var(--fire); }
  `],
})
export class EndOverlayComponent {
  private readonly game = inject(GameStateService);
  private readonly router = inject(Router);
  readonly screen = this.game.screen;
  readonly saved = this.game.saved;
  readonly total = this.game.total;

  restart(): void { this.game.start(); }
  story(): void { this.router.navigate(['/']); }
}
