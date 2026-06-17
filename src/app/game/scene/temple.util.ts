/**
 * temple.util.ts — shared geometry helpers for Dravidian (Chola) temple
 * architecture: stepped pyramidal towers (vimana / gopuram / subsidiary
 * shrines) built as a stack of shrinking tiers.
 */
export interface Tier { y: number; w: number; d: number; h: number; }

/**
 * Build a stack of stepped tiers for a temple tower.
 * @param baseW/baseD base footprint
 * @param levels number of receding tiers
 * @param totalH total tower height (below the cap)
 * @param topScale footprint fraction at the top tier
 */
export function steppedTiers(
  baseW: number, baseD: number, levels: number, totalH: number, topScale = 0.28,
): Tier[] {
  const tiers: Tier[] = [];
  const hPer = totalH / levels;
  let y = 0;
  for (let i = 0; i < levels; i++) {
    const t = levels > 1 ? i / (levels - 1) : 0;
    const s = 1 - (1 - topScale) * t;
    tiers.push({ y: y + hPer / 2, w: baseW * s, d: baseD * s, h: hPer * 0.9 });
    y += hPer;
  }
  return tiers;
}
