import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { GameStateService } from '../core/game-state.service';

/**
 * HudComponent — the heads-up display. Per the NGT requirements this is plain
 * Angular DOM overlaid on the canvas (NOT drawn in WebGL), bound directly to
 * the {@link GameStateService} signals. Ported 1:1 from the original 2D build's
 * HUD markup/styles.
 */
@Component({
  selector: 'app-hud',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="hud">
      <div class="hud-group">
        <span class="hud-label">LIVES</span>
        <div class="hearts">
          @for (i of lifeSlots; track i) {
            <span class="heart" [class.alive]="i < lives()">&#9829;</span>
          }
        </div>
      </div>

      <div class="hud-alert" [class.active]="alert()">
        {{ alert() ? 'WARNING: DETECTED' : 'HIDDEN' }}
      </div>

      <div class="hud-group right">
        <span class="hud-label mode-label" [class.venom]="mode() === 'venom'" [class.nectar]="mode() === 'nectar'">
          {{ mode() === 'venom' ? 'SURGE' : mode() === 'nectar' ? 'CLOAK' : 'NORMAL' }}
        </span>
        <div class="vm-bar-wrap">
          <div class="vm-bar" [style.width.%]="vm()"
               [class.venom]="mode() === 'venom'" [class.nectar]="mode() === 'nectar'"></div>
        </div>
      </div>

      <div class="hud-group">
        <span class="hud-label">SEEN</span>
        <div class="exposure-wrap">
          <div class="exposure-bar" [class.hot]="exposure() >= 60" [style.width.%]="exposure()"></div>
        </div>
      </div>

      <div class="hud-group">
        <span class="hud-label">ORBS</span>
        <div class="naga-dots">
          @for (i of nagaSlots(); track i) {
            <div class="naga-dot" [class.rescued]="i < saved()"></div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .hud {
      position: fixed; top: 0; left: 0; right: 0; z-index: 10;
      display: flex; align-items: center; justify-content: space-between;
      background: rgba(0, 0, 0, 0.85); border-bottom: 1px solid var(--stone);
      padding: 7px 14px; gap: 10px; flex-wrap: wrap;
    }
    .hud-group { display: flex; align-items: center; gap: 7px; }
    .hud-group.right { justify-content: flex-end; }
    .hud-label { font-size: 0.55rem; color: #553322; letter-spacing: 0.2em; }
    .hearts { display: flex; gap: 4px; }
    .heart { font-size: 15px; color: #220e00; transition: color 0.2s; }
    .heart.alive { color: #ff4422; text-shadow: 0 0 8px rgba(255, 50, 0, 0.5); }
    .hud-alert { font-size: 0.85rem; color: #251200; letter-spacing: 0.1em; }
    .hud-alert.active {
      color: #ff3300; animation: pulseAlert 0.35s infinite;
      text-shadow: 0 0 10px rgba(255, 50, 0, 0.5);
    }
    .mode-label { font-size: 0.65rem; color: #3a5533; }
    .mode-label.venom { color: var(--venom); text-shadow: 0 0 8px rgba(170, 255, 0, 0.5); }
    .mode-label.nectar { color: var(--nectar); text-shadow: 0 0 8px rgba(136, 200, 255, 0.5); }
    .vm-bar-wrap, .exposure-wrap {
      width: 66px; height: 5px; background: #100700;
      border: 1px solid #2a1200; border-radius: 2px; overflow: hidden;
    }
    .vm-bar { height: 100%; background: #005522; transition: width 0.12s; }
    .vm-bar.venom { background: var(--venom); }
    .vm-bar.nectar { background: var(--nectar); }
    .exposure-bar {
      height: 100%; background: #7b6a1f;
      transition: width 0.12s, background 0.18s, box-shadow 0.18s;
    }
    .exposure-bar.hot { background: #ff5522; box-shadow: 0 0 10px rgba(255, 80, 20, 0.4); }
    .naga-dots { display: flex; flex-wrap: wrap; gap: 4px; max-width: 80px; }
    .naga-dot {
      width: 11px; height: 11px; border-radius: 50%;
      background: #0a0a18; border: 1px solid var(--naga-dim); transition: all 0.3s;
    }
    .naga-dot.rescued {
      background: var(--naga); box-shadow: 0 0 8px var(--naga-glow); border-color: var(--naga);
    }
  `],
})
export class HudComponent {
  private readonly game = inject(GameStateService);
  readonly lives = this.game.lives;
  readonly alert = this.game.alert;
  readonly vm = this.game.vm;
  readonly exposure = this.game.exposure;
  readonly saved = this.game.saved;
  readonly mode = this.game.mode;

  readonly lifeSlots = [0, 1, 2];
  readonly nagaSlots = computed(() => Array.from({ length: this.game.total() }, (_, i) => i));
}
