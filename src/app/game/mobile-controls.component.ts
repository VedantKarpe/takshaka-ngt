import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GameStateService } from '../core/game-state.service';

/**
 * MobileControlsComponent — a touch D-pad + Venom/Nectar buttons for phones.
 * Forwards into the same {@link GameStateService} input the keyboard uses.
 * Hidden on pointer-capable (desktop) devices via media query.
 */
@Component({
  selector: 'app-mobile-controls',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pad">
      <button class="dir up"
        (pointerdown)="dir('up', true)" (pointerup)="dir('up', false)" (pointerleave)="dir('up', false)">▲</button>
      <button class="dir left"
        (pointerdown)="dir('left', true)" (pointerup)="dir('left', false)" (pointerleave)="dir('left', false)">◄</button>
      <button class="dir right"
        (pointerdown)="dir('right', true)" (pointerup)="dir('right', false)" (pointerleave)="dir('right', false)">►</button>
      <button class="dir down"
        (pointerdown)="dir('down', true)" (pointerup)="dir('down', false)" (pointerleave)="dir('down', false)">▼</button>
    </div>
    <div class="modes">
      <button class="mode venom" (pointerdown)="toggle('venom')">V</button>
      <button class="mode nectar" (pointerdown)="toggle('nectar')">N</button>
    </div>
  `,
  styles: [`
    .pad, .modes { position: fixed; bottom: 24px; z-index: 12; touch-action: none; }
    .pad { left: 24px; width: 150px; height: 150px; }
    .modes { right: 24px; display: flex; gap: 14px; }
    .dir {
      position: absolute; width: 48px; height: 48px; border-radius: 8px;
      background: rgba(20,12,6,0.6); border: 1px solid var(--stone);
      color: var(--fire-dim); font-size: 1rem;
    }
    .dir.up { top: 0; left: 51px; }
    .dir.left { top: 51px; left: 0; }
    .dir.right { top: 51px; right: 0; }
    .dir.down { bottom: 0; left: 51px; }
    .mode {
      width: 56px; height: 56px; border-radius: 50%; font-family: 'Cinzel', serif;
      background: rgba(20,12,6,0.6); font-size: 1.1rem;
    }
    .mode.venom { border: 1px solid var(--venom); color: var(--venom); }
    .mode.nectar { border: 1px solid var(--nectar); color: var(--nectar); }
    @media (hover: hover) and (pointer: fine) { .pad, .modes { display: none; } }
  `],
})
export class MobileControlsComponent {
  private readonly game = inject(GameStateService);
  dir(d: 'up' | 'down' | 'left' | 'right', on: boolean): void { this.game.setDirection(d, on); }
  toggle(m: 'venom' | 'nectar'): void { this.game.sim.toggleMode(m); }
}
