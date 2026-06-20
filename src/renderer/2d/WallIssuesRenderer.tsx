/**
 * WallIssuesRenderer — subtle, non-destructive markers for wall validation
 * hints (overlap, touching-but-not-joined). Draws a small amber ring at each
 * issue; never alters geometry. Hidden when the architectural category is off.
 */

import { Circle, Group } from "react-konva";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useLayersStore } from "@/store/layers.store";
import { useViewportStore } from "@/store/viewport.store";
import { detectWallIssues, type WallIssueKind } from "@/core/wall-junctions";

const ISSUE_COLOR: Record<WallIssueKind, string> = {
  overlap: "#ef4444", // red-500 — overlapping/duplicate walls
  touching: "#f59e0b", // amber-500 — touching but not joined
};

const WallIssuesRenderer = () => {
  const shapes = useFloorPlanStore((s) => s.shapes);
  const visible = useLayersStore((s) => s.visibility.architectural);
  const scale = useViewportStore((s) => s.scale);
  if (!visible) return null;

  const issues = detectWallIssues(shapes);
  if (issues.length === 0) return null;

  const r = 6 / scale; // constant on-screen size

  return (
    <Group listening={false}>
      {issues.map((issue, i) => (
        <Circle
          key={i}
          x={issue.x}
          y={issue.y}
          radius={r}
          stroke={ISSUE_COLOR[issue.kind]}
          strokeWidth={1.5 / scale}
          dash={[3 / scale, 2 / scale]}
          opacity={0.9}
        />
      ))}
    </Group>
  );
};

export default WallIssuesRenderer;
