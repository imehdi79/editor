/**
 * arcGeometry — pure math for circular-arc walls.
 *
 * An arc wall is stored as a chord (x1,y1)→(x2,y2) plus a signed `bulge`: the
 * perpendicular sagitta of the arc's midpoint from the chord midpoint, measured
 * along the chord's left-hand normal (+n). bulge > 0 bows left, < 0 bows right,
 * ≈ 0 is effectively straight. From those we derive the circle (centre, radius),
 * the sweep that actually passes through the apex, the true arc length, and a
 * sampled polyline for rendering / hit-testing.
 *
 * Pure — no React, no Konva, no store.
 */

export interface ArcGeom {
  cx: number;
  cy: number;
  radius: number;
  /** Canvas-space angle (atan2) of the start endpoint about the centre. */
  startAngle: number;
  /** Signed sweep from start to end that passes through the apex (radians). */
  sweep: number;
  /** True arc length in px. */
  length: number;
  /** The arc's far midpoint (sagitta tip). */
  apex: { x: number; y: number };
}

/** Below this |bulge| the arc is treated as straight (no circle). */
export const MIN_BULGE = 0.5;

/**
 * Resolve the arc circle from a chord + bulge. Returns null when the chord is
 * degenerate or the bulge is negligible (caller should fall back to a segment).
 */
export const arcFromChordBulge = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  bulge: number,
): ArcGeom | null => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const chord = Math.hypot(dx, dy);
  if (chord < 1e-6 || Math.abs(bulge) < MIN_BULGE) return null;

  const a = chord / 2;
  const ux = dx / chord;
  const uy = dy / chord;
  const nx = -uy; // chord left-hand normal (+n)
  const ny = ux;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const apex = { x: mx + nx * bulge, y: my + ny * bulge };

  // Signed radius from the sagitta relation R = (a² + s²) / (2s).
  const rs = (a * a + bulge * bulge) / (2 * bulge);
  const cx = mx - nx * (rs - bulge);
  const cy = my - ny * (rs - bulge);
  const radius = Math.abs(rs);

  const startAngle = Math.atan2(y1 - cy, x1 - cx);
  const endAngle = Math.atan2(y2 - cy, x2 - cx);
  const apexAngle = Math.atan2(apex.y - cy, apex.x - cx);

  // Pick the start→end direction (CCW vs CW) whose sweep contains the apex.
  const twoPi = Math.PI * 2;
  const norm = (v: number) => ((v % twoPi) + twoPi) % twoPi;
  const ccwSweep = norm(endAngle - startAngle); // [0, 2π)
  const apexOff = norm(apexAngle - startAngle);
  const sweep = apexOff <= ccwSweep ? ccwSweep : -(twoPi - ccwSweep);

  return { cx, cy, radius, startAngle, sweep, length: radius * Math.abs(sweep), apex };
};

/**
 * Sample the arc into a polyline as a flat [x,y,...] list, at an optional radial
 * offset from the centreline (for face / layer bands; +offset = away from the
 * centre). Falls back to the straight chord when the bulge is negligible.
 */
export const arcPolyline = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  bulge: number,
  segments = 24,
  radialOffset = 0,
): number[] => {
  const arc = arcFromChordBulge(x1, y1, x2, y2, bulge);
  if (!arc) return [x1, y1, x2, y2];
  const r = arc.radius + radialOffset;
  const out: number[] = [];
  for (let k = 0; k <= segments; k++) {
    const ang = arc.startAngle + arc.sweep * (k / segments);
    out.push(arc.cx + r * Math.cos(ang), arc.cy + r * Math.sin(ang));
  }
  return out;
};
