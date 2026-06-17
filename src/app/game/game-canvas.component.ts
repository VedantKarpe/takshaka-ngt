import {
  ChangeDetectionStrategy, Component, HostListener, inject, OnInit,
} from '@angular/core';
import { NgtCanvas } from 'angular-three';
import './scene/extend';                 // side-effect: register THREE catalogue
import { ExperienceComponent } from './scene/experience.component';
import { GameStateService } from '../core/game-state.service';
import { HudComponent } from '../hud/hud.component';
import { EndOverlayComponent } from '../hud/end-overlay.component';
import { MobileControlsComponent } from './mobile-controls.component';

/**
 * GameCanvasComponent — the page that hosts the WebGL game.
 *
 * Layout: a full-screen `<ngt-canvas>` with the {@link ExperienceComponent}
 * scene graph, configured for an ORTHOGRAPHIC 2.5D camera and shadows. Plain
 * Angular DOM (HUD, end overlay, touch controls) is layered on top — never
 * drawn in WebGL.
 *
 * Keyboard input is captured here and forwarded to the {@link GameStateService}.
 */
@Component({
  selector: 'app-game-canvas',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgtCanvas, HudComponent, EndOverlayComponent, MobileControlsComponent],
  template: `
    <ngt-canvas
      [sceneGraph]="experience"
      [camera]="cameraOptions"
      [shadows]="false"
      [dpr]="[1, 1.5]"
      [gl]="glOptions" />

    <app-hud />
    <app-end-overlay />
    <app-mobile-controls />
  `,
  styles: [`
    :host { position: fixed; inset: 0; display: block; background: #0a0604; }
    ngt-canvas { display: block; width: 100%; height: 100%; }
  `],
})
export class GameCanvasComponent implements OnInit {
  private readonly game = inject(GameStateService);

  readonly experience = ExperienceComponent;
  // Third-person perspective camera (behind-the-back); positioned each frame by
  // the Experience. Perspective (not orthographic) for real depth/convergence.
  readonly cameraOptions = { fov: 55, position: [0, 60, 120] as [number, number, number], near: 0.5, far: 12000 };
  readonly glOptions = { antialias: true, toneMappingExposure: 1.1 };

  ngOnInit(): void {
    this.game.start();
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    this.game.keyDown(e.key);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(e: KeyboardEvent): void {
    this.game.keyUp(e.key);
  }
}
