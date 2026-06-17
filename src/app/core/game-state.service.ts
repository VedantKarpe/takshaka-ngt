import { Injectable, signal } from '@angular/core';
import { Simulation } from './simulation';
import { PlayerMode, Screen, SimEvent } from './models';

/**
 * GameStateService — the bridge between the pure {@link Simulation} and the
 * Angular/NGT view.
 *
 * • Owns the single Simulation instance.
 * • Runs a FIXED-TIMESTEP accumulator so the simulation ticks at a constant
 *   60 Hz regardless of render framerate (called from the scene's
 *   `injectBeforeRender`).
 * • Exposes HUD-facing reactive state as Angular signals.
 * • Translates raw keyboard input into simulation input.
 *
 * The view reads `sim.state` directly for per-frame transforms; signals are
 * only for the throttled DOM HUD so we don't trigger change detection 60×/sec.
 */
@Injectable({ providedIn: 'root' })
export class GameStateService {
  readonly sim = new Simulation();

  // Fixed timestep: one sim tick == 1/60 s (matches the original rAF cadence).
  private static readonly FIXED_DT = 1 / 60;
  private static readonly MAX_STEPS = 5; // clamp to avoid spiral-of-death
  private accumulator = 0;
  private hudTick = 0;

  // ── HUD signals ──
  readonly lives    = signal(3);
  readonly vm       = signal(100);
  readonly saved    = signal(0);
  readonly total    = signal(10);
  readonly mode     = signal<PlayerMode>('normal');
  readonly alert    = signal(false);
  readonly exposure = signal(0);
  readonly danger   = signal(0);
  readonly screen   = signal<Screen>('PLAYING');
  readonly shake    = signal(0);
  /** Camera mode: third-person behind-the-back, or tactical top-down. */
  readonly cameraMode = signal<'third' | 'top'>('third');

  /** Raw movement intent (camera-relative semantics: fwd/back/strafe). */
  private readonly intent = { fwd: false, back: false, left: false, right: false };

  /**
   * Analog touch thumbstick intent (screen-space: x = strafe-right,
   * y = forward), each component in [-1, 1]. Takes precedence over `intent`
   * while engaged so a phone player gets smooth, any-angle movement.
   */
  private readonly stick = { x: 0, y: 0, active: false };

  /** Drained-event listeners (audio, etc.). */
  private eventSinks: ((e: SimEvent) => void)[] = [];
  onEvent(fn: (e: SimEvent) => void): void { this.eventSinks.push(fn); }

  start(): void {
    this.sim.reset();
    this.accumulator = 0;
    this.hudTick = 0;
    this.screen.set('PLAYING');
    this.syncHud(true);
  }

  /**
   * Called once per RENDER frame from `injectBeforeRender`. Advances the sim by
   * as many fixed ticks as `delta` (seconds) warrants.
   */
  advance(delta: number): void {
    if (this.screen() !== 'PLAYING') return;
    // Guard against huge deltas (tab refocus) before clamping with MAX_STEPS.
    this.accumulator += Math.min(delta, 0.25);
    let steps = 0;
    while (this.accumulator >= GameStateService.FIXED_DT && steps < GameStateService.MAX_STEPS) {
      this.sim.step();
      this.accumulator -= GameStateService.FIXED_DT;
      steps++;
      this.drain();
      if (this.sim.state.over || this.sim.state.won) break;
    }
    if (steps > 0) this.syncHud(false);
  }

  private drain(): void {
    const events = this.sim.drainEvents();
    for (const e of events) {
      for (const sink of this.eventSinks) sink(e);
    }
  }

  /** Throttled (4× downsampled) push of sim state into HUD signals. */
  private syncHud(force: boolean): void {
    this.hudTick++;
    if (!force && this.hudTick % 4 !== 0) {
      // Still surface terminal transitions immediately.
      if (!this.sim.state.over && !this.sim.state.won) {
        this.shake.set(this.sim.state.shake);
        return;
      }
    }
    const s = this.sim.state;
    this.lives.set(s.player.lives);
    this.vm.set(Math.round(s.player.vm));
    this.saved.set(s.nagas.filter(n => n.rescued).length);
    this.mode.set(s.player.mode);
    this.exposure.set(Math.round(this.sim.exposure * 100));
    this.alert.set(this.sim.alerting || s.alertFlash > 20);
    this.danger.set(Math.round(s.danger));
    this.shake.set(s.shake);
    if (s.over) this.screen.set('OVER');
    else if (s.won) this.screen.set('WIN');
  }

  // ── input ──────────────────────────────────────────────────────────────────
  keyDown(key: string): void {
    switch (key) {
      case 'ArrowUp': case 'w': case 'W': this.intent.fwd = true; break;
      case 'ArrowDown': case 's': case 'S': this.intent.back = true; break;
      case 'ArrowLeft': case 'a': case 'A': this.intent.left = true; break;
      case 'ArrowRight': case 'd': case 'D': this.intent.right = true; break;
      case 'v': case 'V':
        if (this.screen() === 'PLAYING') this.sim.toggleMode('venom');
        break;
      case 'n': case 'N':
        if (this.screen() === 'PLAYING') this.sim.toggleMode('nectar');
        break;
      case 'c': case 'C':
        this.cameraMode.update(m => (m === 'third' ? 'top' : 'third'));
        break;
    }
  }

  keyUp(key: string): void {
    switch (key) {
      case 'ArrowUp': case 'w': case 'W': this.intent.fwd = false; break;
      case 'ArrowDown': case 's': case 'S': this.intent.back = false; break;
      case 'ArrowLeft': case 'a': case 'A': this.intent.left = false; break;
      case 'ArrowRight': case 'd': case 'D': this.intent.right = false; break;
    }
  }

  /**
   * Analog touch thumbstick. `x` = strafe-right, `y` = forward, each in
   * [-1, 1] (the knob's normalised offset from its base). The model both moves
   * and turns to follow this vector — see {@link applyMovement}. Pass (0, 0) to
   * release.
   */
  setStick(x: number, y: number): void {
    this.stick.x = x;
    this.stick.y = y;
    this.stick.active = x !== 0 || y !== 0;
  }

  /**
   * Resolve the raw intent into a world-space move direction for the sim. Called
   * by the view each frame BEFORE `advance`, passing the camera's current yaw
   * (the heading the camera looks along, game-space radians).
   *
   * • third-person → camera-relative: fwd = where the camera looks, strafe ⟂.
   * • top-down     → world-space: W=north, S=south, A=west, D=east.
   */
  applyMovement(camYaw: number): void {
    const i = this.intent;
    // Analog thumbstick wins while engaged; otherwise fall back to keys/flags.
    const fb = this.stick.active ? this.stick.y : (i.fwd ? 1 : 0) - (i.back ? 1 : 0);
    const lr = this.stick.active ? this.stick.x : (i.right ? 1 : 0) - (i.left ? 1 : 0);
    let dx: number, dy: number;
    if (this.cameraMode() === 'third') {
      // forward = (cos camYaw, sin camYaw); screen-right = (-sin, cos).
      const fx = Math.cos(camYaw), fy = Math.sin(camYaw);
      dx = fx * fb - fy * lr;
      dy = fy * fb + fx * lr;
    } else {
      // World-space: forward (W) is north = -y.
      dx = lr;
      dy = -fb;
    }
    this.sim.input.dirX = dx;
    this.sim.input.dirY = dy;
  }
}
