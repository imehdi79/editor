/**
 * materialHatch — cached CAD hatch tiles per construction material.
 *
 * Each material maps to a professional drafting hatch (concrete stipple, masonry
 * diagonal, stone cross, insulation batt, tile grid, wood grain). A tile is a
 * small transparent canvas drawn once and reused as a Konva `fillPatternImage`,
 * so the GPU tiles it for free — one canvas per material keeps mobile cheap.
 *
 * Keyed off the material NAME (matching `WALL_MATERIALS`): adding a material =
 * add one `HATCH_KIND` entry. Plain materials (plaster, drywall) and the
 * structural core (no material name → solid poché) intentionally have no hatch.
 *
 * Hatches are authored in world px and tiled in the wall's coordinate space, so
 * they scale with the drawing; the renderer skips them below `HATCH_MIN_SCALE`
 * (LOD) so a zoomed-out plan stays clean and cheap.
 */

type HatchKind = "stipple" | "diagonal" | "cross" | "zigzag" | "grid" | "wood";

/** Material name → hatch style. Unlisted materials render as a solid fill. */
const HATCH_KIND: Record<string, HatchKind> = {
  Concrete: "stipple",
  Block: "diagonal",
  Stone: "cross",
  Insulation: "zigzag",
  Wood: "wood",
  Tile: "grid",
  Brick: "diagonal",
};

/** Hide hatches below this viewport scale — they'd be sub-pixel noise. */
export const HATCH_MIN_SCALE = 0.8;

const TILE = 8; // world-px tile size
const STROKE = "rgba(15,23,42,0.38)"; // slate-950, translucent — reads on any band

const drawTile = (kind: HatchKind): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = TILE;
  canvas.height = TILE;
  const ctx = canvas.getContext("2d")!;
  ctx.strokeStyle = STROKE;
  ctx.fillStyle = STROKE;
  ctx.lineWidth = 0.6;

  switch (kind) {
    case "stipple": // concrete — scattered dots
      for (const [x, y] of [[2, 2], [6, 3], [3, 6], [6.5, 6.5], [4.5, 1]]) {
        ctx.beginPath();
        ctx.arc(x, y, 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case "diagonal": // masonry / brick — 45° parallel lines (wrap the corners)
      ctx.beginPath();
      ctx.moveTo(0, TILE);
      ctx.lineTo(TILE, 0);
      ctx.moveTo(-TILE, TILE);
      ctx.lineTo(TILE, -TILE);
      ctx.moveTo(0, 2 * TILE);
      ctx.lineTo(2 * TILE, 0);
      ctx.stroke();
      break;
    case "cross": // stone — both diagonals
      ctx.beginPath();
      ctx.moveTo(0, TILE);
      ctx.lineTo(TILE, 0);
      ctx.moveTo(0, 0);
      ctx.lineTo(TILE, TILE);
      ctx.stroke();
      break;
    case "zigzag": // insulation — batt chevron
      ctx.beginPath();
      ctx.moveTo(0, TILE);
      ctx.lineTo(TILE / 2, 0);
      ctx.lineTo(TILE, TILE);
      ctx.stroke();
      break;
    case "grid": // tile — square grid
      ctx.beginPath();
      ctx.moveTo(0, 0.3);
      ctx.lineTo(TILE, 0.3);
      ctx.moveTo(0.3, 0);
      ctx.lineTo(0.3, TILE);
      ctx.stroke();
      break;
    case "wood": // grain — single fine diagonal
      ctx.beginPath();
      ctx.moveTo(0, TILE);
      ctx.lineTo(TILE, 0);
      ctx.stroke();
      break;
  }
  return canvas;
};

const cache = new Map<string, HTMLCanvasElement | null>();

/** Cached hatch tile for a material, or null when it renders as a solid fill. */
export const materialHatch = (material: string): HTMLCanvasElement | null => {
  const hit = cache.get(material);
  if (hit !== undefined) return hit;
  const kind = HATCH_KIND[material];
  const tile = kind ? drawTile(kind) : null;
  cache.set(material, tile);
  return tile;
};
