/**
 * Rulers — the desktop CAD ruler gutters (md+).
 *
 * A top horizontal and left vertical graduated strip plus the corner box. The
 * graduations pan and scale with the viewport (background offset = viewport
 * translation, tick spacing = a "nice" world step × zoom), giving the canvas the
 * familiar CAD frame. Purely visual chrome — the status bar carries the readout.
 */

import { useViewportStore } from "@/store/viewport.store";

// Header (48) + sub-page bar (36) = 84px; + ruler height (24) = 108px.
const RULER = 24; // px gutter thickness
const TOP = 84; // px from window top to the ruler band
const LEFT = 48; // px from window left (tool rail width) to the vertical ruler

/** A "nice" minor tick spacing in screen px, kept readable across zoom levels. */
const niceStep = (scale: number) => {
  let s = 50 * scale;
  while (s < 6) s *= 2;
  while (s > 120) s /= 2;
  return s;
};

const Rulers = () => {
  const { x, y, scale } = useViewportStore();
  const minor = niceStep(scale);
  const major = minor * 5;

  const ticks = (axis: "x" | "y") => {
    const deg = axis === "x" ? "90deg" : "0deg";
    return `repeating-linear-gradient(${deg}, var(--grid-strong) 0, var(--grid-strong) 1px, transparent 1px, transparent ${minor}px), repeating-linear-gradient(${deg}, var(--ink-3) 0, var(--ink-3) 1px, transparent 1px, transparent ${major}px)`;
  };

  // World origin maps to (x, y) in window px; offset by each ruler's own origin.
  const offX = x - (LEFT + RULER);
  const offY = y - (TOP + RULER);

  return (
    <>
      {/* corner box */}
      <div className="fixed left-12 top-21 z-30 hidden size-6 bg-panel hair md:block" />

      {/* horizontal ruler */}
      <div className="fixed right-72 top-21 z-30 hidden h-6 overflow-hidden bg-panel hair md:block" style={{ left: LEFT + RULER }}>
        <div
          className="absolute inset-0"
          style={{ backgroundImage: ticks("x"), backgroundPositionX: `${offX}px, ${offX}px`, backgroundRepeat: "repeat" }}
        />
      </div>

      {/* vertical ruler */}
      <div className="fixed bottom-7 left-12 z-30 hidden w-6 overflow-hidden bg-panel hair md:block" style={{ top: TOP + RULER }}>
        <div
          className="absolute inset-0"
          style={{ backgroundImage: ticks("y"), backgroundPositionY: `${offY}px, ${offY}px`, backgroundRepeat: "repeat" }}
        />
      </div>
    </>
  );
};

export default Rulers;
