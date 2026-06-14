/**
 * DrawingInfoCanvas — drawing-information / takeoff table rendered as a true
 * world-space Konva object (mobile-first: it lives on the canvas and scales /
 * pans with the plan rather than floating as a DOM overlay).
 *
 * One row per shape; enclosed loops appended as Room rows. The table anchors
 * GAP_WORLD px to the right of the rightmost object, at the topmost object's y.
 *
 * Editing: a canvas can't host HTML inputs, so a tapped numeric cell publishes
 * its screen rect + field to `drawingInfoEditStore`; the DOM `DrawingInfoEditOverlay`
 * renders the actual <input> over it and commits the change.
 */

import { Group, Rect, Text, Line } from "react-konva";
import type Konva from "konva";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useEditorStore } from "@/store/editor.store";
import { useViewportStore } from "@/store/viewport.store";
import { useDrawingInfoEditStore } from "@/store/drawing-info-edit.store";
import type { Shape } from "@/core/drawing-engine/drawing.types";
import { buildDrawingInfo, type DrawingRow, type DrawingCell } from "@/core/drawing-info/buildDrawingInfo";

// ---------------------------------------------------------------------------
// Layout (world px) & palette
// ---------------------------------------------------------------------------

const GAP_WORLD = 24; // distance from rightmost object to the table
const ROW_H = 22;
const HEADER_H = 22;
const FONT = 12;
const PAD_X = 6;

const COLS = [
  { key: "type", label: "Type", w: 92, align: "left" as const },
  { key: "length", label: "Length", w: 66, align: "right" as const },
  { key: "width", label: "Width", w: 58, align: "right" as const },
  { key: "height", label: "Height", w: 56, align: "right" as const },
  { key: "area", label: "Area", w: 70, align: "right" as const },
];
const TABLE_W = COLS.reduce((sum, c) => sum + c.w, 0);

const PANEL_BG = "#ffffff";
const PANEL_STROKE = "#d4d4d8";
const HEADER_BG = "#f4f4f5";
const HEADER_TEXT = "#52525b";
const ROW_ALT = "#fafafa";
const TEXT = "#27272a";
const MUTED = "#71717a";
const GRID = "#e4e4e7";
const EDIT_STROKE = "#a1a1aa";
const EDIT_BG = "#f0f9ff"; // sky-50 tint to flag editable cells

// ---------------------------------------------------------------------------
// Anchor: top-left world position of the table
// ---------------------------------------------------------------------------

/**
 * Right edge / top edge of every shape, including wall & opening thickness.
 * The thick-segment extent past its centerline endpoints is |dy|/len ×
 * (thickness/2) in x and |dx|/len × (thickness/2) in y.
 */
const tableAnchor = (shapes: Record<string, Shape>): { x: number; y: number } | null => {
  let right = -Infinity;
  let top = Infinity;
  for (const s of Object.values(shapes)) {
    if (s.type === "text") {
      right = Math.max(right, s.x);
      top = Math.min(top, s.y);
      continue;
    }
    const half =
      s.type === "wall" || s.type === "window" || s.type === "door" ? s.thickness / 2 : 0;
    const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1) || 1;
    const perpX = (Math.abs(s.y2 - s.y1) / len) * half;
    const perpY = (Math.abs(s.x2 - s.x1) / len) * half;
    right = Math.max(right, s.x1 + perpX, s.x2 + perpX);
    top = Math.min(top, s.y1 - perpY, s.y2 - perpY);
  }
  if (!Number.isFinite(right) || !Number.isFinite(top)) return null;
  return { x: right + GAP_WORLD, y: top };
};

const isEditable = (c: DrawingCell): boolean => c.field !== undefined && c.value !== undefined;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DrawingInfoCanvas = () => {
  const shapes = useFloorPlanStore((s) => s.shapes);
  const unit = useEditorStore((s) => s.dimensionUnit);
  const ppm = useEditorStore((s) => s.pixelsPerMeter);
  const defaultWallHeight = useEditorStore((s) => s.defaultWallHeight);
  const setEditing = useDrawingInfoEditStore((s) => s.setEditing);

  const rows = buildDrawingInfo(shapes, unit, ppm, defaultWallHeight);
  const anchor = tableAnchor(shapes);
  if (rows.length === 0 || anchor === null) return null;

  const tableH = HEADER_H + rows.length * ROW_H;

  // Per-row cells in column order (type cell is synthesised from row.type).
  const cellsOf = (row: DrawingRow): DrawingCell[] => [
    { display: row.type },
    row.length,
    row.width,
    row.height,
    row.area,
  ];

  // x offset of each column's left edge
  const colLeft: number[] = [];
  COLS.reduce((x, c, i) => {
    colLeft[i] = x;
    return x + c.w;
  }, 0);

  const openEditor = (
    e: Konva.KonvaEventObject<MouseEvent | TouchEvent>,
    row: DrawingRow,
    cell: DrawingCell,
    localX: number,
    localY: number,
    cellW: number,
  ) => {
    e.cancelBubble = true; // don't let the tap reach the drawing tools
    const stage = e.target.getStage();
    if (!stage) return;
    const box = stage.container().getBoundingClientRect();
    const { x: vx, y: vy, scale } = useViewportStore.getState();
    const worldX = anchor.x + localX;
    const worldY = anchor.y + localY;
    setEditing({
      rowId: row.id,
      field: cell.field!,
      value: cell.value!,
      x: box.left + worldX * scale + vx,
      y: box.top + worldY * scale + vy,
      w: cellW * scale,
      h: ROW_H * scale,
    });
  };

  return (
    <Group x={anchor.x} y={anchor.y}>
      {/* Panel background */}
      <Rect
        x={0}
        y={0}
        width={TABLE_W}
        height={tableH}
        fill={PANEL_BG}
        stroke={PANEL_STROKE}
        strokeWidth={0.75}
        cornerRadius={4}
        shadowColor="#000000"
        shadowOpacity={0.12}
        shadowBlur={6}
        shadowOffsetY={2}
        listening={false}
      />

      {/* Header */}
      <Rect x={0} y={0} width={TABLE_W} height={HEADER_H} fill={HEADER_BG} cornerRadius={[4, 4, 0, 0]} listening={false} />
      {COLS.map((c, i) => (
        <Text
          key={`h-${c.key}`}
          x={colLeft[i] + PAD_X}
          y={(HEADER_H - FONT) / 2}
          width={c.w - PAD_X * 2}
          align={c.align}
          text={c.label}
          fontSize={FONT}
          fontStyle="bold"
          fill={HEADER_TEXT}
          listening={false}
        />
      ))}

      {/* Rows */}
      {rows.map((row, r) => {
        const rowTop = HEADER_H + r * ROW_H;
        const cells = cellsOf(row);
        return (
          <Group key={row.id}>
            {r % 2 === 1 && <Rect x={0} y={rowTop} width={TABLE_W} height={ROW_H} fill={ROW_ALT} listening={false} />}
            <Line points={[0, rowTop, TABLE_W, rowTop]} stroke={GRID} strokeWidth={0.5} listening={false} />
            {cells.map((cell, i) => {
              const col = COLS[i];
              const editable = isEditable(cell);
              const textColor = i === 0 ? TEXT : editable ? TEXT : MUTED;
              return (
                <Group key={`${row.id}-${col.key}`}>
                  {editable && (
                    <Rect
                      x={colLeft[i] + 1.5}
                      y={rowTop + 2}
                      width={col.w - 3}
                      height={ROW_H - 4}
                      fill={EDIT_BG}
                      stroke={EDIT_STROKE}
                      strokeWidth={0.5}
                      cornerRadius={2}
                      onMouseDown={(e) => openEditor(e, row, cell, colLeft[i] + 1.5, rowTop + 2, col.w - 3)}
                      onTouchStart={(e) => openEditor(e, row, cell, colLeft[i] + 1.5, rowTop + 2, col.w - 3)}
                    />
                  )}
                  <Text
                    x={colLeft[i] + PAD_X}
                    y={rowTop + (ROW_H - FONT) / 2}
                    width={col.w - PAD_X * 2}
                    align={col.align}
                    text={cell.display}
                    fontSize={FONT}
                    fill={textColor}
                    listening={false}
                  />
                </Group>
              );
            })}
          </Group>
        );
      })}
    </Group>
  );
};

export default DrawingInfoCanvas;
