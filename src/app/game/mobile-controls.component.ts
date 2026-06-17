import { ChangeDetectionStrategy, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { GameStateService } from '../core/game-state.service';

/**
 * MobileControlsComponent — a touch thumbstick + Venom/Nectar buttons for
 * phones. Dragging the stick feeds an analog direction into the same
 * {@link GameStateService} input the keyboard uses; the model moves AND turns to
 * follow the thumb, so there are no fiddly arrow keys to aim for.
 * Hidden on pointer-capable (desktop) devices via media query.
 */
@Component({
  selector: 'app-mobile-controls',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #base class="stick"
      (pointerdown)="grab($event)"
      (pointermove)="drag($event)"
      (pointerup)="release($event)"
      (pointercancel)="release($event)">
      <div class="knob" [style.transform]="knob()"></div>
    </div>
    <div class="modes">
      <button class="mode venom" (pointerdown)="toggle('venom')">V</button>
      <button class="mode nectar" (pointerdown)="toggle('nectar')">N</button>
    </div>
  `,
  styles: [`
    .stick, .modes { position: fixed; bottom: 28px; z-index: 12; touch-action: none; }
    .stick {
      left: 28px; width: 140px; height: 140px; border-radius: 50%;
      background: rgba(20,12,6,0.45); border: 1px solid var(--stone);
    }
    .knob {
      position: absolute; top: 50%; left: 50%; width: 52px; height: 52px;
      margin: -26px 0 0 -26px; border-radius: 50%;
      background: rgba(40,24,12,0.85); border: 1px solid var(--fire-dim);
      box-shadow: 0 0 12px rgba(0,0,0,0.5); will-change: transform;
    }
    .modes { right: 24px; display: flex; gap: 14px; }
    .mode {
      width: 56px; height: 56px; border-radius: 50%; font-family: 'Cinzel', serif;
      background: rgba(20,12,6,0.6); font-size: 1.1rem;
    }
    .mode.venom { border: 1px solid var(--venom); color: var(--venom); }
    .mode.nectar { border: 1px solid var(--nectar); color: var(--nectar); }
    @media (hover: hover) and (pointer: fine) { .stick, .modes { display: none; } }
  `],
})
export class MobileControlsComponent {
  private readonly game = inject(GameStateService);
  private readonly base = viewChild.required<ElementRef<HTMLDivElement>>('base');

  /** Max knob travel from centre, in px (keeps the knob inside the base). */
  private static readonly R = 44;

  private active = false;
  readonly knob = signal('translate(0px, 0px)');

  grab(e: PointerEvent): void {
    this.active = true;
    this.base().nativeElement.setPointerCapture(e.pointerId);
    this.drag(e);
  }

  drag(e: PointerEvent): void {
    if (!this.active) return;
    const r = this.base().nativeElement.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2);
    let dy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(dx, dy);
    const R = MobileControlsComponent.R;
    if (len > R) { dx = (dx / len) * R; dy = (dy / len) * R; }
    this.knob.set(`translate(${dx}px, ${dy}px)`);
    // Screen-up (negative dy) is forward; right (positive dx) is strafe-right.
    this.game.setStick(dx / R, -dy / R);
  }

  release(e: PointerEvent): void {
    if (!this.active) return;
    this.active = false;
    this.base().nativeElement.releasePointerCapture(e.pointerId);
    this.knob.set('translate(0px, 0px)');
    this.game.setStick(0, 0);
  }

  toggle(m: 'venom' | 'nectar'): void { this.game.sim.toggleMode(m); }
}
