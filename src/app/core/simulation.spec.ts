/**
 * simulation.spec.ts — unit tests for the rendering-agnostic game brain.
 *
 * These run under Karma/Jasmine but import NOTHING from Three.js / Angular /
 * the DOM — proving the simulation core is testable in isolation.
 */
import { Simulation } from './simulation';
import { PSPD, VSPD, NSPD, RESCUE_R, HIT_INVIC } from './models';

/** Run N fixed ticks. */
function steps(sim: Simulation, n: number): void {
  for (let i = 0; i < n; i++) sim.step();
}

describe('Simulation core', () => {
  let sim: Simulation;
  beforeEach(() => { sim = new Simulation(); });

  it('builds the initial state with the expected entity counts', () => {
    expect(sim.state.player.lives).toBe(3);
    expect(sim.state.player.vm).toBe(100);
    expect(sim.state.player.mode).toBe('normal');
    expect(sim.state.nagas.length).toBe(10);
    expect(sim.state.guards.length).toBe(6);
    expect(sim.state.guards.every(g => g.id >= 0)).toBeTrue();
  });

  it('moves the player by the normal speed when a direction is held', () => {
    const x0 = sim.state.player.x;
    sim.input.right = true;
    sim.step();
    // movement happens before clamping; player starts mid-arena so no clamp.
    expect(sim.state.player.x).toBeCloseTo(x0 + PSPD, 5);
  });

  it('uses venom and nectar speeds when in those modes', () => {
    sim.state.player.mode = 'venom';
    const x0 = sim.state.player.x;
    sim.input.right = true;
    sim.step();
    expect(sim.state.player.x - x0).toBeCloseTo(VSPD, 1);

    sim.reset();
    sim.state.player.mode = 'nectar';
    const x1 = sim.state.player.x;
    sim.input.right = true;
    sim.step();
    expect(sim.state.player.x - x1).toBeCloseTo(NSPD, 1);
  });

  it('drains the meter in venom/nectar and refills in normal', () => {
    sim.state.player.mode = 'venom';
    const vm0 = sim.state.player.vm;
    sim.step();
    expect(sim.state.player.vm).toBeLessThan(vm0);

    sim.reset();
    sim.state.player.vm = 50;
    sim.step(); // normal mode
    expect(sim.state.player.vm).toBeGreaterThan(50);
  });

  it('toggleMode respects the meter floor and toggles back to normal', () => {
    sim.toggleMode('venom');
    expect(sim.state.player.mode).toBe('venom');
    sim.toggleMode('venom');
    expect(sim.state.player.mode).toBe('normal');

    sim.state.player.vm = 5; // below the >10 threshold
    sim.toggleMode('nectar');
    expect(sim.state.player.mode).toBe('normal');
  });

  it('rescues a naga on contact and emits a rescue event', () => {
    const naga = sim.state.nagas[0];
    sim.state.player.x = naga.x;
    sim.state.player.y = naga.y;
    sim.step();
    expect(naga.rescued).toBeTrue();
    expect(sim.drainEvents().some(e => e.kind === 'rescue')).toBeTrue();
  });

  it('wins when every naga is rescued', () => {
    // Teleport the player onto each naga in turn.
    for (const n of sim.state.nagas) {
      sim.state.player.x = n.x;
      sim.state.player.y = n.y;
      sim.step();
      if (sim.state.won) break;
    }
    expect(sim.state.nagas.every(n => n.rescued)).toBeTrue();
    expect(sim.state.won).toBeTrue();
  });

  it('spawns the High Priest boss after the 5th rescue', () => {
    let rescued = 0;
    for (const n of sim.state.nagas) {
      if (rescued >= 5) break;
      sim.state.player.x = n.x;
      sim.state.player.y = n.y;
      sim.step();
      rescued++;
    }
    expect(sim.state.guards.some(g => g.boss)).toBeTrue();
  });

  it('takes fire damage with invincibility frames and loses a life', () => {
    const fire = sim.state.fires[0];
    sim.state.player.x = fire.x;
    sim.state.player.y = fire.y;
    sim.step();
    expect(sim.state.player.lives).toBe(2);
    expect(sim.state.player.invic).toBeGreaterThan(0);
    expect(sim.state.player.invic).toBeLessThanOrEqual(HIT_INVIC);
  });

  it('a guard facing the player at close range raises its detection meter', () => {
    const gd = sim.state.guards[0];
    sim.state.player.x = gd.x + 30; // within VIS_RANGE
    sim.state.player.y = gd.y;
    gd.angle = 0;                   // looking +x, toward player
    const det0 = gd.det;
    sim.step();
    expect(gd.det).toBeGreaterThan(det0);
  });

  it('nectar mode reduces how fast a guard detects the player', () => {
    const setup = (mode: 'normal' | 'nectar') => {
      const s = new Simulation();
      // Isolate the VISION path: with every naga rescued there is no
      // "defend the threatened naga" shortcut to chase, so detection rises
      // purely from line-of-sight — which is what nectar should dampen.
      s.state.nagas.forEach(n => n.rescued = true);
      const gd = s.state.guards[0];
      s.state.player.x = gd.x + 40;
      s.state.player.y = gd.y;
      s.state.player.mode = mode;
      gd.angle = 0;
      s.step();
      return s.state.guards[0].det;
    };
    expect(setup('nectar')).toBeLessThan(setup('normal'));
  });

  it('collects amrita: restores a life and adds meter', () => {
    sim.state.player.lives = 1;
    sim.state.player.vm = 10;
    const am = sim.state.amritas[0];
    sim.state.player.x = am.x;
    sim.state.player.y = am.y;
    sim.step();
    expect(am.collected).toBeTrue();
    expect(sim.state.player.lives).toBe(2);
    expect(sim.state.player.vm).toBeGreaterThan(10);
  });

  it('is deterministic in entity identity after reset', () => {
    const before = sim.state.guards.map(g => g.id);
    sim.reset();
    const after = sim.state.guards.map(g => g.id);
    expect(after).toEqual(before); // ids restart from 0 each reset
  });

  it('does not advance once the game is over', () => {
    sim.state.over = true;
    const frame0 = sim.state.frame;
    steps(sim, 5);
    expect(sim.state.frame).toBe(frame0);
  });
});
