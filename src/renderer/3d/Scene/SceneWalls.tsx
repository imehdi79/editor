/**
 * SceneWalls — extrudes the 2D wall network into 3D, each wall to its OWN
 * height (WallShape.height, carried since the 2D model). Per-wall height boxes
 * mean a height mismatch at a junction reads naturally — the taller wall simply
 * rises above the shorter one, no special case needed.
 *
 * Units: the 2D plan is in px (pixelsPerMeter px = 1 m); height is stored in cm.
 * Everything is converted to metres and centred on the plan centroid so the
 * model sits near the origin for the camera. Arc walls are extruded as a series
 * of boxes along their sampled polyline.
 *
 * Only rendered inside the lazy 3D Canvas — uses fiber intrinsics, no static
 * `three` import, so it stays out of the first-paint graph.
 */

import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useEditorStore } from "@/store/editor.store";
import { arcPolyline } from "@/core/arc/arcGeometry";

const WALL_COLOR = "#cbd5e1"; // slate-300

interface WallSeg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
  heightCm: number;
}

const SceneWalls = () => {
  const shapes = useFloorPlanStore((s) => s.shapes);
  const ppm = useEditorStore((s) => s.pixelsPerMeter);
  const defaultHeight = useEditorStore((s) => s.defaultWallHeight);

  // Flatten straight + arc walls into extrudable segments.
  const segs: WallSeg[] = [];
  for (const s of Object.values(shapes)) {
    if (s.type === "wall") {
      segs.push({ x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2, thickness: s.thickness, heightCm: s.height ?? defaultHeight });
    } else if (s.type === "arc-wall") {
      const pts = arcPolyline(s.x1, s.y1, s.x2, s.y2, s.bulge, 20);
      for (let i = 0; i + 3 < pts.length; i += 2) {
        segs.push({ x1: pts[i], y1: pts[i + 1], x2: pts[i + 2], y2: pts[i + 3], thickness: s.thickness, heightCm: s.height ?? defaultHeight });
      }
    }
  }

  if (segs.length === 0) return null;

  // Centroid (px) so the model is centred near the origin.
  let cx = 0;
  let cy = 0;
  for (const sg of segs) {
    cx += sg.x1 + sg.x2;
    cy += sg.y1 + sg.y2;
  }
  cx /= segs.length * 2;
  cy /= segs.length * 2;

  return (
    <group>
      {segs.map((sg, i) => {
        const dx = sg.x2 - sg.x1;
        const dy = sg.y2 - sg.y1;
        const lenM = Math.hypot(dx, dy) / ppm;
        if (lenM < 1e-4) return null;
        const midX = ((sg.x1 + sg.x2) / 2 - cx) / ppm;
        const midZ = ((sg.y1 + sg.y2) / 2 - cy) / ppm;
        const hM = sg.heightCm / 100; // cm → m
        const tM = sg.thickness / ppm;
        const rotY = -Math.atan2(dy, dx); // 2D heading → rotation about +Y

        return (
          <mesh key={i} position={[midX, hM / 2, midZ]} rotation={[0, rotY, 0]} castShadow receiveShadow>
            <boxGeometry args={[lenM, hM, tM]} />
            <meshStandardMaterial color={WALL_COLOR} />
          </mesh>
        );
      })}
    </group>
  );
};

export default SceneWalls;
