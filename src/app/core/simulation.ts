/**
 * simulation.ts — the game "brain".
 *
 * A pure, deterministic, rendering-agnostic simulation lifted from the original
 * 2D-canvas build's `GameComponent.update()` and its helpers. It contains the
 * guard AI state machine, the Venom/Nectar meter logic, detection math, the
 * spawn director and scoring — and NOTHING that touches Three.js, the DOM or
 * audio.
 *
 * Contract with the view:
 *   • The view writes ONLY to `input` and calls `toggleMode()` / `step()`.
 *   • The view reads `state` to position 3D objects, and drains `state.events`
 *     for audio / camera shake.
 *   • One `step()` == one fixed simulation tick (originally one rAF frame at
 *     ~60fps). The view decides how many ticks to run per render frame using a
 *     fixed-timestep accumulator, so behaviour is framerate-independent.
 */

import {
  Amrita, DETECT_MAX, dist, Fire, GameState, GCSPD, GSPD, GUARD_CHASE_SPEED_MULTIPLIER,
  GUARD_PATROL_ROUTES, GUARD_PROTECT_RADIUS, GUARD_PUSH_DISTANCE, GUARD_RESPONSE_RADIUS,
  Guard, GW, GH, Hazard, HIT_INVIC, MAX_GUARDS, Naga, nextGuardId, NSPD, Particle,
  PILLARS, Player, Point, PSPD, RESCUE_R, SimEvent, SimEventKind, spawnParticles,
  STUN_DUR, TRAIL, VIS_ANGLE, VIS_RANGE, VSPD, WORLD_MAX_X, WORLD_MAX_Y, WORLD_MIN_X,
  WORLD_MIN_Y, buildInitialState,
} from './models';

export interface SimInput {
  up: boolean; down: boolean; left: boolean; right: boolean;
  /**
   * World-space desired move direction (game coords: +x east, +y south).
   * Set by the view for camera-relative controls. When non-zero it OVERRIDES
   * the boolean flags; the booleans remain the fallback (and keep the unit
   * tests view-independent).
   */
  dirX: number; dirY: number;
}

/** A static collision cylinder the player is pushed out of. */
export interface Obstacle { x: number; y: number; r: number; }

export class Simulation {
  state: GameState = buildInitialState();
  readonly input: SimInput = { up: false, down: false, left: false, right: false, dirX: 0, dirY: 0 };

  /**
   * Static collision obstacles. Defaults to the arena PILLARS. The original
   * build also pushed against procedurally-generated chunk terrain; that was a
   * rendering-world-gen concern, so it is dropped here. The view MAY register
   * additional static colliders (e.g. placeholder ruins) via `setObstacles`.
   */
  private obstacles: Obstacle[] = [...PILLARS];

  private guardSpawnCooldown = 120;
  private bossSpawned = false;
  private prevVm = 100;

  constructor() {
    this.reset();
  }

  reset(): void {
    this.state = buildInitialState();
    this.guardSpawnCooldown = 120;
    this.bossSpawned = false;
    this.prevVm = 100;
    this.initGuardPatrols();
  }

  setObstacles(extra: Obstacle[]): void {
    this.obstacles = [...PILLARS, ...extra];
  }

  toggleMode(m: 'venom' | 'nectar'): void {
    if (this.state.over || this.state.won) return;
    const p = this.state.player;
    const prev = p.mode;
    p.mode = p.mode === m ? 'normal' : (p.vm > 10 ? m : 'normal');
    if (p.mode !== prev && p.mode !== 'normal') {
      this.emit(m, p.x, p.y, 0);
    }
  }

  /** Advance the simulation by exactly one fixed tick. */
  step(): void {
    const g = this.state;
    if (g.over || g.won) return;
    g.frame++;
    if (g.shake > 0) g.shake = Math.max(0, g.shake - 0.6);

    const { player, fires, guards, nagas, hazards, amritas, parts } = g;

    this.updatePlayerMovement(player);
    this.updatePlayerTrail(player);
    this.updateModeMeter(player);
    this.updateVenomTrail(player, parts);

    if (this.updateGuards(player, guards, parts, g)) return;
    if (this.updateNagaRescue(player, nagas, parts, g)) return;
    if (this.updateFireDamage(player, fires, parts, g)) return;
    if (this.updateHazards(player, hazards, parts, g)) return;
    this.updateAmrita(player, amritas, parts);
    this.updateGuardSpawns(player, g);

    this.updateParticles(parts);

    if (g.alertFlash > 0) g.alertFlash--;
  }

  /** Whether any guard is actively hunting (HUD "alert" state). */
  get alerting(): boolean {
    return this.state.guards.some(gd => gd.state === 'chase' || gd.state === 'search');
  }

  /** Max exposure pressure across guards in [0,1] (HUD "SEEN" bar). */
  exposure = 0;

  // ── events ────────────────────────────────────────────────────────────────
  private emit(kind: SimEventKind, x: number, y: number, shake: number): void {
    this.state.events.push({ kind, x, y, shake });
    if (shake > this.state.shake) this.state.shake = shake;
  }

  /** Drain queued one-shot events (audio / shake). */
  drainEvents(): SimEvent[] {
    const e = this.state.events;
    this.state.events = [];
    return e;
  }

  // ── collision ───────────────────────────────────────────────────────────────
  private pushPlayer(x: number, y: number): Point {
    const R = 16;
    for (const p of this.obstacles) {
      const dx = x - p.x, dy = y - p.y;
      const d = Math.hypot(dx, dy), min = R + p.r;
      if (d < min && d > 0) { const f = (min - d) / d; x += dx * f; y += dy * f; }
    }
    return { x, y };
  }

  // ── player ───────────────────────────────────────────────────────────────────
  private updatePlayerMovement(player: Player): void {
    let mx = this.input.dirX, my = this.input.dirY;
    // Fall back to the boolean flags (world-space) when no analog dir is set.
    if (mx === 0 && my === 0) {
      if (this.input.up)    my -= 1;
      if (this.input.down)  my += 1;
      if (this.input.left)  mx -= 1;
      if (this.input.right) mx += 1;
    }

    const speed = player.mode === 'venom' ? VSPD : player.mode === 'nectar' ? NSPD : PSPD;
    if (mx || my) {
      const len = Math.hypot(mx, my) || 1;
      const dx = (mx / len) * speed;
      const dy = (my / len) * speed;
      player.angle = Math.atan2(my / len, mx / len);
      const p = this.pushPlayer(player.x + dx, player.y + dy);
      player.x = p.x; player.y = p.y;
    }

    player.x = Math.max(WORLD_MIN_X + 20, Math.min(WORLD_MAX_X - 20, player.x));
    player.y = Math.max(WORLD_MIN_Y + 20, Math.min(WORLD_MAX_Y - 20, player.y));
  }

  private updatePlayerTrail(player: Player): void {
    player.body.unshift({ x: player.x, y: player.y });
    if (player.body.length > TRAIL) player.body.pop();
  }

  private updateModeMeter(player: Player): void {
    if (player.mode !== 'normal') {
      player.vm = Math.max(0, player.vm - 0.42);
      if (player.vm === 0) player.mode = 'normal';
    } else {
      player.vm = Math.min(100, player.vm + 0.18);
    }
    this.prevVm = player.vm;
    if (player.invic > 0) player.invic--;
  }

  private updateVenomTrail(player: Player, parts: Particle[]): void {
    if (player.mode !== 'venom') return;
    const tail = player.body[TRAIL - 1] ?? player;
    if (Math.random() < 0.75) {
      parts.push({
        x: tail.x + (Math.random() - 0.5) * 10,
        y: tail.y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        color: '#aaff00',
        life: 16 + Math.random() * 14,
        r: 2 + Math.random() * 2.5,
      });
    }
  }

  // ── guards / AI ───────────────────────────────────────────────────────────────
  private initGuardPatrols(): void {
    this.state.guards.forEach((guard, i) => {
      const a = this.nextGuardRouteTarget(guard, i, this.state.nagas, 14, 40);
      const b = this.nextGuardRouteTarget(guard, i, this.state.nagas, 22, 58);
      guard.pA = a;
      guard.pB = b;
      guard.toB = true;
      guard.home = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      guard.lastSeen = { x: guard.x, y: guard.y };
      guard.searchT = 0;
    });
  }

  private nextGuardRouteTarget(
    guard: Guard, guardIndex: number, nagas: Naga[], minOffset = 20, maxOffset = 70,
  ): Point {
    const route = GUARD_PATROL_ROUTES[guardIndex % GUARD_PATROL_ROUTES.length];
    if (!route || route.length === 0 || nagas.length === 0) {
      const pl = this.state.player;
      return pl ? { x: pl.x, y: pl.y } : { x: GW / 2, y: GH / 2 };
    }

    let step = guard.routeStep ?? 0;
    let chosen: Naga | undefined;
    for (let i = 0; i < route.length; i++) {
      const idx = route[(step + i) % route.length];
      const candidate = nagas[idx];
      if (!candidate) continue;
      if (!candidate.rescued) {
        chosen = candidate;
        step = (step + i + 1) % route.length;
        break;
      }
    }
    if (!chosen) {
      const idx = route[step % route.length];
      chosen = nagas[idx] ?? nagas[0];
      step = (step + 1) % route.length;
    }
    guard.routeStep = step;

    const angle = Math.random() * Math.PI * 2;
    const distR = minOffset + Math.random() * (maxOffset - minOffset);
    const x = chosen.x + Math.cos(angle) * distR;
    const y = chosen.y + Math.sin(angle) * distR;
    return {
      x: Math.max(WORLD_MIN_X + 20, Math.min(WORLD_MAX_X - 20, x)),
      y: Math.max(WORLD_MIN_Y + 20, Math.min(WORLD_MAX_Y - 20, y)),
    };
  }

  private setGuardChase(gd: Guard, player: Player, game: GameState): void {
    gd.state = 'chase';
    gd.lastSeen = { x: player.x, y: player.y };
    gd.searchT = 0;
    gd.det = DETECT_MAX;
    game.alertFlash = Math.max(game.alertFlash, 40);
  }

  private setGuardSearch(gd: Guard): void {
    gd.state = 'search';
    gd.searchT = 110;
    gd.det = Math.max(DETECT_MAX * 0.42, gd.det);
  }

  private findThreatenedNaga(player: Player, nagas: Naga[]): Naga | null {
    let best: Naga | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const n of nagas) {
      if (n.rescued) continue;
      const d = dist(player, n);
      if (d < bestDist) { best = n; bestDist = d; }
    }
    return best && bestDist <= GUARD_PROTECT_RADIUS ? best : null;
  }

  private getGuardChaseTarget(player: Player, threatenedNaga: Naga | null): Point {
    if (!threatenedNaga) return { x: player.x, y: player.y };
    const dx = player.x - threatenedNaga.x;
    const dy = player.y - threatenedNaga.y;
    const len = Math.hypot(dx, dy) || 1;
    const tx = player.x + (dx / len) * GUARD_PUSH_DISTANCE;
    const ty = player.y + (dy / len) * GUARD_PUSH_DISTANCE;
    return {
      x: Math.max(WORLD_MIN_X + 20, Math.min(WORLD_MAX_X - 20, tx)),
      y: Math.max(WORLD_MIN_Y + 20, Math.min(WORLD_MAX_Y - 20, ty)),
    };
  }

  /** Returns true if the game ended this tick. Also updates `exposure`/alert. */
  private updateGuards(player: Player, guards: Guard[], parts: Particle[], game: GameState): boolean {
    let exposure = 0;
    const threatenedNaga = this.findThreatenedNaga(player, game.nagas);

    for (let gi = 0; gi < guards.length; gi++) {
      const gd = guards[gi];
      if (gd.stun > 0) { gd.stun--; gd.tph += 0.05; continue; }
      gd.tph += 0.06;

      const toPlayer = Math.atan2(player.y - gd.y, player.x - gd.x);
      let diff = toPlayer - gd.angle;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      const distanceToPlayer = dist(gd, player);
      const nectarMultiplier = player.mode === 'nectar' ? 0.28 : 1;
      const baseVisionRange  = gd.boss ? VIS_RANGE * 2   : VIS_RANGE;
      const baseVisionAngle  = gd.boss ? VIS_ANGLE * 1.3 : VIS_ANGLE;
      const visionRange = baseVisionRange * (threatenedNaga ? 1.2 : 1.05);
      const inCone = distanceToPlayer < visionRange && Math.abs(diff) < baseVisionAngle / 2;

      if (gd.boss && (gd.venomHitTimer ?? 0) > 0) {
        gd.venomHitTimer!--;
        if (gd.venomHitTimer === 0) gd.venomHits = 0;
      }
      const visibility = inCone ? nectarMultiplier : 0;
      const canDefendThreat = !!threatenedNaga && dist(gd, threatenedNaga) < GUARD_RESPONSE_RADIUS;
      const seenPressure = visibility > 0
        ? Math.max(0, 1 - distanceToPlayer / Math.max(visionRange, 1)) * (0.55 + visibility * 0.45) : 0;
      exposure = Math.max(exposure, seenPressure, gd.det / DETECT_MAX);

      if (gd.state === 'patrol') {
        if (visibility > 0) {
          gd.lastSeen = { x: player.x, y: player.y };
          gd.det = Math.min(DETECT_MAX, gd.det + (visibility > 0.5 ? 4 : 2.2));
        } else {
          gd.det = Math.max(0, gd.det - 0.45);
        }
        if (canDefendThreat && distanceToPlayer < GUARD_PROTECT_RADIUS + 120) {
          gd.lastSeen = { x: player.x, y: player.y };
          gd.det = Math.min(DETECT_MAX, gd.det + 2.8);
        }
        if (gd.det >= DETECT_MAX || (canDefendThreat && distanceToPlayer < GUARD_PROTECT_RADIUS * 0.95)) {
          this.setGuardChase(gd, player, game);
          continue;
        }
        const target = gd.toB ? gd.pB : gd.pA;
        const gdx = target.x - gd.x;
        const gdy = target.y - gd.y;
        if (Math.hypot(gdx, gdy) < 5) {
          gd.toB = !gd.toB;
          const wp = this.nextGuardRouteTarget(gd, gi, game.nagas, 12, 45);
          if (gd.toB) gd.pB = wp; else gd.pA = wp;
        } else {
          const guardDist = Math.hypot(gdx, gdy);
          gd.x += (gdx / guardDist) * GSPD;
          gd.y += (gdy / guardDist) * GSPD;
          gd.angle = Math.atan2(gdy, gdx);
        }
        continue;
      }

      if (gd.state === 'alert') {
        gd.alertT--;
        if (gd.alertT <= 0) {
          gd.state = 'patrol';
          gd.det = 0;
          gd.pA = this.nextGuardRouteTarget(gd, gi, game.nagas, 14, 45);
          gd.pB = this.nextGuardRouteTarget(gd, gi, game.nagas, 22, 60);
          gd.toB = true;
        }
        if (visibility > 0 || (canDefendThreat && distanceToPlayer < GUARD_PROTECT_RADIUS + 90)) {
          gd.lastSeen = { x: player.x, y: player.y };
          gd.det = Math.min(DETECT_MAX, gd.det + 3.8);
          if (gd.det >= DETECT_MAX) this.setGuardChase(gd, player, game);
        } else {
          gd.det = Math.max(0, gd.det - 0.4);
        }
        continue;
      }

      if (gd.state === 'search') {
        gd.searchT--;
        if (visibility > 0) {
          gd.lastSeen = { x: player.x, y: player.y };
          gd.det = Math.min(DETECT_MAX, gd.det + 4.2);
          if (gd.det >= DETECT_MAX * 0.78) { this.setGuardChase(gd, player, game); continue; }
        }
        const searchSpeed = GSPD * 1.1;
        if (gd.trail.length > 0) {
          const wp = gd.trail[gd.trail.length - 1]!;
          const wdx = wp.x - gd.x;
          const wdy = wp.y - gd.y;
          const wdist = Math.hypot(wdx, wdy);
          if (wdist < 14) {
            gd.trail.pop();
          } else {
            gd.x += (wdx / wdist) * searchSpeed;
            gd.y += (wdy / wdist) * searchSpeed;
            gd.angle = Math.atan2(wdy, wdx);
          }
        } else {
          const sdx = gd.lastSeen.x - gd.x;
          const sdy = gd.lastSeen.y - gd.y;
          const searchDistance = Math.hypot(sdx, sdy);
          if (searchDistance > 12) {
            gd.x += (sdx / searchDistance) * searchSpeed;
            gd.y += (sdy / searchDistance) * searchSpeed;
            gd.angle = Math.atan2(sdy, sdx);
          } else {
            gd.angle += (gi % 2 === 0 ? 1 : -1) * 0.06;
          }
        }
        gd.det = Math.max(DETECT_MAX * 0.28, gd.det - 0.18);
        if (gd.searchT <= 0) {
          gd.trail = [];
          gd.state = 'alert';
          gd.alertT = 60;
          gd.det = Math.min(gd.det, DETECT_MAX * 0.35);
          const nearNaga = game.nagas
            .filter(n => !n.rescued)
            .sort((a, b) => dist(gd, a) - dist(gd, b))[0];
          if (nearNaga) {
            const orbitA = Math.random() * Math.PI * 2;
            const orbitB = orbitA + Math.PI * 0.8;
            const r1 = 35 + Math.random() * 30;
            const r2 = 35 + Math.random() * 30;
            gd.pA = { x: nearNaga.x + Math.cos(orbitA) * r1, y: nearNaga.y + Math.sin(orbitA) * r1 };
            gd.pB = { x: nearNaga.x + Math.cos(orbitB) * r2, y: nearNaga.y + Math.sin(orbitB) * r2 };
            gd.toB = true;
          }
        }
        continue;
      }

      // ── chase ──
      const chaseTarget = this.getGuardChaseTarget(player, threatenedNaga);
      const cdx = chaseTarget.x - gd.x;
      const cdy = chaseTarget.y - gd.y;
      const chaseDistance = Math.hypot(cdx, cdy);
      if (chaseDistance > 0) {
        const chaseSpeed = GCSPD * (canDefendThreat ? GUARD_CHASE_SPEED_MULTIPLIER : 1);
        gd.x += (cdx / chaseDistance) * chaseSpeed;
        gd.y += (cdy / chaseDistance) * chaseSpeed;
        gd.angle = Math.atan2(cdy, cdx);
      }
      if (visibility > 0 || canDefendThreat) {
        gd.lastSeen = { x: player.x, y: player.y };
        gd.trailTimer = (gd.trailTimer ?? 0) + 1;
        if (gd.trailTimer >= 15) {
          gd.trailTimer = 0;
          gd.trail.push({ x: player.x, y: player.y });
          if (gd.trail.length > 8) gd.trail.shift();
        }
      }
      if (visibility === 0 && !canDefendThreat) {
        gd.det = Math.max(0, gd.det - 1.8);
        if (gd.det <= DETECT_MAX * 0.35) this.setGuardSearch(gd);
      } else {
        gd.det = Math.min(DETECT_MAX, gd.det + 0.8);
      }
      if (distanceToPlayer < (gd.boss ? 26 : 20) && player.invic === 0) {
        if (player.mode === 'venom') {
          if (gd.boss) {
            gd.venomHits = (gd.venomHits ?? 0) + 1;
            gd.venomHitTimer = 50;
            if (gd.venomHits >= 2) {
              gd.state = 'patrol'; gd.stun = STUN_DUR;
              gd.det = 0; gd.searchT = 0;
              gd.venomHits = 0; gd.venomHitTimer = 0;
              spawnParticles(parts, gd.x, gd.y, '#ff6600', 30);
              this.emit('stun', gd.x, gd.y, 7);
            } else {
              spawnParticles(parts, gd.x, gd.y, '#ff8800', 18);
              player.invic = 28;
              this.emit('hit', gd.x, gd.y, 4);
            }
          } else {
            gd.state = 'patrol'; gd.stun = STUN_DUR;
            gd.det = 0; gd.searchT = 0;
            spawnParticles(parts, gd.x, gd.y, '#aaff00', 14);
            this.emit('stun', gd.x, gd.y, 0);
          }
        } else {
          player.lives--;
          player.invic = HIT_INVIC;
          player.mode = 'normal';
          game.alertFlash = 65;
          spawnParticles(parts, player.x, player.y, '#ff4400', 12);
          this.emit('hit', player.x, player.y, 9);
          if (player.lives <= 0) {
            game.over = true;
            this.emit('over', player.x, player.y, 0);
            this.exposure = exposure;
            return true;
          }
        }
      }
    }

    this.exposure = exposure;
    return false;
  }

  private spawnBossGuard(game: GameState): void {
    if (this.bossSpawned) return;
    this.bossSpawned = true;
    const x = 450, y = 160;
    const boss: Guard = {
      id: nextGuardId(),
      x, y, angle: Math.PI / 2,
      home: { x, y },
      pA: { x: 150, y: 170 }, pB: { x: 750, y: 170 }, toB: true,
      lastSeen: { x, y }, trail: [],
      state: 'patrol',
      stun: 0, det: 0, alertT: 0, searchT: 0, tph: 0.5,
      boss: true, venomHits: 0, venomHitTimer: 0,
      routeStep: 0, trailTimer: 0,
    };
    game.guards.push(boss);
    game.alertFlash = 90;
    spawnParticles(game.parts, x, y, '#ff5500', 60);
    this.emit('bossSpawn', x, y, 14);
  }

  private alertNearbyGuards(rescuedNaga: Naga, game: GameState): void {
    const ALERT_RADIUS = 320;
    for (const gd of game.guards) {
      if (gd.stun > 0) continue;
      if (dist(gd, rescuedNaga) > ALERT_RADIUS) continue;
      gd.lastSeen = { x: rescuedNaga.x, y: rescuedNaga.y };
      gd.trail = [];
      if (gd.state === 'patrol' || gd.state === 'alert') {
        gd.state = 'search';
        gd.searchT = 140;
        gd.det = Math.max(gd.det, DETECT_MAX * 0.6);
      }
    }
  }

  private updateNagaRescue(player: Player, nagas: Naga[], parts: Particle[], game: GameState): boolean {
    for (const n of nagas) {
      if (n.rescued) { continue; }
      n.ph += 0.04;
      if (dist(player, n) < RESCUE_R) {
        n.rescued = true;
        spawnParticles(parts, n.x, n.y, '#5599ff', 50);
        this.emit('rescue', n.x, n.y, 0);
        this.alertNearbyGuards(n, game);
        if (nagas.filter(nn => nn.rescued).length === 5) {
          this.spawnBossGuard(game);
        }
        const nearestUnrescued = nagas
          .filter(nn => !nn.rescued)
          .sort((a, b) => dist(n, a) - dist(n, b))[0];
        if (nearestUnrescued) {
          const dx = nearestUnrescued.x - n.x;
          const dy = nearestUnrescued.y - n.y;
          const d = Math.hypot(dx, dy) || 1;
          const spd = 3.2;
          for (let t = 0; t < 28; t++) {
            parts.push({
              x: n.x + (Math.random() - 0.5) * 10,
              y: n.y + (Math.random() - 0.5) * 10,
              vx: (dx / d) * spd + (Math.random() - 0.5) * 0.7,
              vy: (dy / d) * spd + (Math.random() - 0.5) * 0.7,
              color: '#ffcc44',
              life: 12 + Math.floor(t * 1.4),
              r: 2.5 + Math.random() * 2,
            });
          }
        }
        if (nagas.every(nn => nn.rescued)) {
          game.won = true;
          this.emit('win', player.x, player.y, 0);
          return true;
        }
      }
    }
    return false;
  }

  private updateFireDamage(player: Player, fires: Fire[], parts: Particle[], game: GameState): boolean {
    for (const fi of fires) {
      fi.ph += 0.08;
      const radius = fi.r + Math.sin(fi.ph) * 7;
      if (dist(player, fi) < radius * 0.6 && player.invic === 0) {
        player.lives--;
        player.invic = HIT_INVIC;
        game.alertFlash = 55;
        spawnParticles(parts, player.x, player.y, '#ff7700', 14);
        this.spawnHitScatter(player, parts);
        this.emit('hit', player.x, player.y, 9);
        if (player.lives <= 0) {
          game.over = true;
          this.emit('over', player.x, player.y, 0);
          return true;
        }
      }
    }
    return false;
  }

  private updateHazards(player: Player, hazards: Hazard[], parts: Particle[], game: GameState): boolean {
    game.danger = Math.min(100, game.danger + 0.055);
    const rescued = game.nagas.filter(n => n.rescued).length;
    const HAZARD_CAP = 8;
    const maxHazards = Math.min(HAZARD_CAP, 1 + Math.floor(game.danger / 28) + Math.floor(rescued / 3));
    const spawnChance = 0.0018 + game.danger * 0.00005 + rescued * 0.00035;

    if (hazards.length < maxHazards && Math.random() < spawnChance) {
      for (let attempt = 0; attempt < 16; attempt++) {
        const a = Math.random() * Math.PI * 2;
        const d = 120 + Math.random() * 340;
        const sx = player.x + Math.cos(a) * d;
        const sy = player.y + Math.sin(a) * d;
        const x = Math.max(WORLD_MIN_X + 40, Math.min(WORLD_MAX_X - 40, sx));
        const y = Math.max(WORLD_MIN_Y + 40, Math.min(WORLD_MAX_Y - 40, sy));
        if (dist(player, { x, y }) < 95) continue;
        if (game.fires.some(fi => dist(fi, { x, y }) < fi.r + 70)) continue;
        if (game.nagas.some(n => !n.rescued && dist(n, { x, y }) < RESCUE_R + 45)) continue;
        const r = 20 + Math.random() * 12;
        const life = 220;
        hazards.push({ x, y, r, life, maxLife: life });
        spawnParticles(parts, x, y, '#ff6600', 12);
        break;
      }
    }

    for (let i = hazards.length - 1; i >= 0; i--) {
      const hz = hazards[i];
      hz.life--;
      if (hz.life <= 0) { hazards.splice(i, 1); continue; }
      const active = hz.life < hz.maxLife * 0.78;
      if (active && player.invic === 0 && dist(player, hz) < hz.r * 0.78) {
        player.lives--;
        player.invic = HIT_INVIC;
        game.alertFlash = 60;
        spawnParticles(parts, player.x, player.y, '#ff9900', 16);
        this.spawnHitScatter(player, parts);
        this.emit('hit', player.x, player.y, 10);
        if (player.lives <= 0) {
          game.over = true;
          this.emit('over', player.x, player.y, 0);
          return true;
        }
      }
    }
    return false;
  }

  private updateGuardSpawns(player: Player, game: GameState): void {
    if (game.guards.length >= MAX_GUARDS) return;
    if (game.nagas.every(n => n.rescued)) return;
    if (this.guardSpawnCooldown > 0) { this.guardSpawnCooldown--; return; }

    const rescued = game.nagas.filter(n => n.rescued).length;
    const targetCount = Math.min(MAX_GUARDS, 6 + Math.floor(game.danger / 16) + rescued);
    if (game.guards.length >= targetCount) { this.guardSpawnCooldown = 50; return; }

    const spawnChance = Math.min(0.95, 0.72 + game.danger * 0.003 + rescued * 0.03);
    if (Math.random() < spawnChance) this.spawnRandomGuard(player, game);

    const nextCd = 150 - Math.floor(game.danger) - rescued * 10;
    this.guardSpawnCooldown = Math.max(40, nextCd);
  }

  private spawnRandomGuard(player: Player, game: GameState): void {
    const activeNagas = game.nagas.filter(n => !n.rescued);
    if (!activeNagas.length) return;

    for (let attempt = 0; attempt < 28; attempt++) {
      const anchor = activeNagas[Math.floor(Math.random() * activeNagas.length)];
      if (!anchor) return;
      const angle = Math.random() * Math.PI * 2;
      const distFromNaga = 85 + Math.random() * 135;
      const x = Math.max(WORLD_MIN_X + 20, Math.min(WORLD_MAX_X - 20, anchor.x + Math.cos(angle) * distFromNaga));
      const y = Math.max(WORLD_MIN_Y + 20, Math.min(WORLD_MAX_Y - 20, anchor.y + Math.sin(angle) * distFromNaga));
      if (dist(player, { x, y }) < 170) continue;
      if (game.fires.some(fi => dist(fi, { x, y }) < fi.r + 60)) continue;
      if (game.guards.some(gd => dist(gd, { x, y }) < 70)) continue;

      const guardIndex = game.guards.length;
      const guard: Guard = {
        id: nextGuardId(),
        x, y,
        angle: Math.random() * Math.PI * 2,
        home: { x: anchor.x, y: anchor.y },
        pA: { x, y }, pB: { x, y }, toB: true,
        lastSeen: { x, y }, trail: [],
        state: 'patrol', stun: 0, det: 0, alertT: 0, searchT: 0,
        tph: Math.random() * Math.PI * 2,
        routeStep: Math.floor(Math.random() * GUARD_PATROL_ROUTES.length),
        trailTimer: 0,
      };
      guard.pA = this.nextGuardRouteTarget(guard, guardIndex, game.nagas, 12, 42);
      guard.pB = this.nextGuardRouteTarget(guard, guardIndex, game.nagas, 20, 58);
      guard.home = { x: (guard.pA.x + guard.pB.x) / 2, y: (guard.pA.y + guard.pB.y) / 2 };
      game.guards.push(guard);
      spawnParticles(game.parts, x, y, '#ffcc44', 16);
      break;
    }
  }

  private updateParticles(parts: Particle[]): void {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.06;
      p.life--;
      if (p.life <= 0) parts.splice(i, 1);
    }
  }

  private spawnHitScatter(player: Player, parts: Particle[]): void {
    const col = player.mode === 'venom' ? '#bbff00' : player.mode === 'nectar' ? '#44aaff' : '#00ff88';
    for (let i = 0; i < TRAIL; i += 2) {
      const seg = player.body[i] ?? player;
      const spd = 2.5 + Math.random() * 3;
      const a = Math.random() * Math.PI * 2;
      parts.push({
        x: seg.x + (Math.random() - 0.5) * 12,
        y: seg.y + (Math.random() - 0.5) * 12,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        color: col,
        life: 20 + Math.random() * 22,
        r: 3 + Math.random() * 3,
      });
    }
  }

  private updateAmrita(player: Player, amritas: Amrita[], parts: Particle[]): void {
    const PICKUP_R = 35;
    const RESPAWN_FRAMES = 1800;
    for (const am of amritas) {
      if (am.collected) {
        if (am.respawnIn > 0) am.respawnIn--;
        if (am.respawnIn === 0) {
          am.collected = false;
          spawnParticles(parts, am.x, am.y, '#ffdd44', 22);
        }
        continue;
      }
      am.ph += 0.05;
      if (dist(player, am) < PICKUP_R) {
        am.collected = true;
        am.respawnIn = RESPAWN_FRAMES;
        player.lives = Math.min(3, player.lives + 1);
        player.vm = Math.min(100, player.vm + 40);
        spawnParticles(parts, am.x, am.y, '#ffdd44', 40);
        this.emit('amrita', am.x, am.y, 3);
      }
    }
  }
}
