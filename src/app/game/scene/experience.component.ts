import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core';
import { injectBeforeRender, NgtArgs } from 'angular-three';
import * as THREE from 'three';
import { GameStateService } from '../../core/game-state.service';
import { cx, cz } from './coords';
import { DecorComponent } from './decor.component';
import { PlayerComponent } from './player.component';
import { GuardsComponent } from './guards.component';
import { NagasComponent } from './nagas.component';
import { FiresComponent } from './fires.component';
import { AmritasComponent } from './amritas.component';
import { HazardsComponent } from './hazards.component';
import { ParticlesComponent } from './particles.component';
import { PostFxComponent } from './post-fx.component';
import { OutlineLayerComponent } from './outline-layer.component';
import { SkyDomeComponent } from './sky-dome.component';
import { PropsComponent } from './props.component';
import { CourtyardComponent } from './courtyard.component';
import { HorizonRuinsComponent } from './horizon-ruins.component';
import { MandapaComponent } from './mandapa.component';
import { EmbersComponent } from './embers.component';
import { TemplesComponent } from './temples.component';
import { PrakaraComponent } from './prakara.component';

/**
 * ExperienceComponent — the NGT scene-graph ROOT (passed to `<ngt-canvas>` as
 * its `sceneGraph`).
 *
 * Responsibilities:
 *   1. Base lighting. Deliberately DIM — a warm dusk ambient plus a soft
 *      directional key for shadows. Real visibility comes from the torch / fire
 *      / naga point lights carried by the entities, which is what makes the
 *      Nectar "hide in shadow" mechanic legible.
 *   2. Hosts every entity component.
 *   3. The SINGLE simulation driver: its `injectBeforeRender` (registered before
 *      the children's, since the parent constructs first) advances the
 *      fixed-timestep sim, then drives the camera follow + shake. Children then
 *      read the freshly-stepped state to write their own transforms.
 */
@Component({
  selector: 'app-experience',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    NgtArgs,
    SkyDomeComponent, HorizonRuinsComponent, DecorComponent, CourtyardComponent,
    PrakaraComponent, TemplesComponent, MandapaComponent, PropsComponent,
    PlayerComponent, GuardsComponent, NagasComponent,
    FiresComponent, AmritasComponent, HazardsComponent, ParticlesComponent, EmbersComponent,
    OutlineLayerComponent, PostFxComponent,
  ],
  template: `
    <!-- Dusk horizon fog so distant ruins melt into the amber skyline -->
    <ngt-color *args="['#2a1f3a']" attach="background" />
    <ngt-fog *args="['#7a5550', 850, 2600]" attach="fog" />

    <!-- Cool dusk fill + a warm low sun that carves the cel bands -->
    <ngt-ambient-light [intensity]="0.34" [color]="'#6a5a82'" />
    <ngt-hemisphere-light [intensity]="0.4" [color]="'#3a2f55'" [groundColor]="'#5a4838'" />

    <!-- Warm setting sun, low in the sky (shadows disabled for perf; the cel
         look reads fine without a shadow pass) -->
    <ngt-directional-light [position]="[320, 300, 220]" [intensity]="1.4" [color]="'#ffb070'" />

    <app-sky-dome />
    <app-horizon-ruins />
    <app-decor />
    <app-courtyard />
    <app-prakara />
    <app-temples />
    <app-mandapa />
    <app-props />
    <app-fires />
    <app-nagas />
    <app-amritas />
    <app-hazards />
    <app-guards />
    <app-player />
    <app-particles />
    <app-embers />
    <app-outline-layer />
    <app-post-fx />
  `,
})
export class ExperienceComponent {
  private readonly game = inject(GameStateService);

  // Third-person behind-the-back rig (abeto/Messenger style): the camera rides
  // behind Takshaka along a SMOOTHED heading (camYaw), low and slightly above,
  // looking ahead down his path. The same camYaw is the basis for the
  // camera-relative controls, so the keys always match what's on screen.
  private static readonly DIST = 95;        // distance behind
  private static readonly HEIGHT = 60;      // height above ground
  private static readonly LOOK_AHEAD = 50;
  private static readonly LOOK_HEIGHT = 18;
  // Tactical top-down framing (toggled with C).
  private static readonly TOP_HEIGHT = 470;
  private static readonly TOP_BACK = 360;

  private readonly desiredPos = new THREE.Vector3();
  private readonly lookTarget = new THREE.Vector3();
  private readonly smoothLook = new THREE.Vector3();
  private camYaw = 0;
  private started = false;

  constructor() {
    injectBeforeRender(({ delta, camera }) => {
      const p = this.game.sim.state.player;
      if (!this.started) this.camYaw = p.angle;

      // 1. Feed camera-relative movement, THEN step the sim, so this tick moves
      //    Takshaka in the direction the player intends on screen.
      this.game.applyMovement(this.camYaw);
      this.game.advance(delta);

      const px = cx(p.x), pz = cz(p.y);
      const shake = this.game.sim.state.shake;
      const jx = (Math.random() - 0.5) * shake * 1.5;
      const jz = (Math.random() - 0.5) * shake * 1.5;

      if (this.game.cameraMode() === 'third') {
        const fx = Math.cos(this.camYaw), fz = Math.sin(this.camYaw);
        this.desiredPos.set(px - fx * ExperienceComponent.DIST + jx, ExperienceComponent.HEIGHT, pz - fz * ExperienceComponent.DIST + jz);
        this.lookTarget.set(px + fx * ExperienceComponent.LOOK_AHEAD, ExperienceComponent.LOOK_HEIGHT, pz + fz * ExperienceComponent.LOOK_AHEAD);
      } else {
        this.desiredPos.set(px + jx, ExperienceComponent.TOP_HEIGHT, pz + ExperienceComponent.TOP_BACK + jz);
        this.lookTarget.set(px, 0, pz);
      }

      if (!this.started) {
        camera.position.copy(this.desiredPos);
        this.smoothLook.copy(this.lookTarget);
        this.started = true;
      }
      // Frame-rate-independent damping.
      camera.position.lerp(this.desiredPos, 1 - Math.exp(-delta * 6));
      this.smoothLook.lerp(this.lookTarget, 1 - Math.exp(-delta * 8));
      camera.lookAt(this.smoothLook);

      // 2. Ease camYaw toward Takshaka's heading (shortest angular path).
      let d = p.angle - this.camYaw;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      this.camYaw += d * (1 - Math.exp(-delta * 4));
    });
  }
}
