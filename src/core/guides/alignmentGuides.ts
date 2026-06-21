import type { Shape, GuideLine } from "@/core/drawing-engine/drawing.types";

const GUIDE_EXTEND = 1000; // px — خط guide چقدر کشیده بشه

// همه x و y قابل توجه از شکل‌های موجود
const extractKeyCoords = (shapes: Record<string, Shape>) => {
  const xs = new Set<number>();
  const ys = new Set<number>();

  for (const shape of Object.values(shapes)) {
    if (shape.type === "text") {
      xs.add(shape.x);
      ys.add(shape.y);
      continue;
    }
    xs.add(shape.x1);
    xs.add(shape.x2);
    ys.add(shape.y1);
    ys.add(shape.y2);
    xs.add((shape.x1 + shape.x2) / 2);
    ys.add((shape.y1 + shape.y2) / 2);
  }

  return { xs: [...xs], ys: [...ys] };
};

export interface GuideResult {
  guides: GuideLine[];
  snappedX: number | null; // اگه به x snap شد
  snappedY: number | null; // اگه به y snap شد
}

export const computeAlignmentGuides = (
  x: number,
  y: number,
  shapes: Record<string, Shape>,
  guideThreshold: number,
  scale: number = 1,
): GuideResult => {
  const threshold = guideThreshold / scale;
  const { xs, ys } = extractKeyCoords(shapes);
  const guides: GuideLine[] = [];
  let snappedX: number | null = null;
  let snappedY: number | null = null;

  // چک vertical alignment (همون x)
  for (const kx of xs) {
    if (Math.abs(x - kx) < threshold) {
      snappedX = kx;
      guides.push({
        x1: kx,
        y1: y - GUIDE_EXTEND,
        x2: kx,
        y2: y + GUIDE_EXTEND,
        axis: "vertical",
      });
      break;
    }
  }

  // چک horizontal alignment (همون y)
  for (const ky of ys) {
    if (Math.abs(y - ky) < threshold) {
      snappedY = ky;
      guides.push({
        x1: x - GUIDE_EXTEND,
        y1: ky,
        x2: x + GUIDE_EXTEND,
        y2: ky,
        axis: "horizontal",
      });
      break;
    }
  }

  return { guides, snappedX, snappedY };
};
