/**
 * DrawingInfoCanvas — drawing-information / takeoff table rendered as a true
 * world-space Konva object (mobile-first: it lives on the canvas and scales /
 * pans with the plan rather than floating as a DOM overlay).
 *
 * One row per shape; enclosed loops appended as Room rows. The table anchors
 * GAP_WORLD px to the right of the rightmost object, at the topmost object's y.
 *
 * Read-only: cells are never edited here (dimensions are edited via the wall
 * panel / by dragging on the plan). The table is the selection surface instead:
 *   - tapping a shape row selects that shape and switches to the select tool;
 *   - the selected shape's row is highlighted;
 *   - a selected wall expands master→detail into its per-side construction
 *     layers, with one-tap add (＋) / remove (×) right on the canvas.
 */

import { Group, Rect, Text, Line } from "react-konva";
import type Konva from "konva";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useEditorStore } from "@/store/editor.store";
import { useToolsStore } from "@/store/tools.store";
import { useSelectionStore } from "@/store/selection.store";
import type { Shape, WallShape, WallSide } from "@/core/drawing-engine/drawing.types";
import { buildDrawingInfo, type DrawingRow, type DrawingCell } from "@/core/drawing-info/buildDrawingInfo";
import { buildWallLayerRows } from "@/core/wall-layers/buildWallLayerRows";
import {
  WALL_SIDES,
  materialColor,
  createWallLayer,
  layersOf,
  withSideLayers,
} from "@/core/wall-layers/wallLayers";
import { useTranslation, type TranslationKey } from "@/i18n";

// ---------------------------------------------------------------------------
// Layout (world px) & palette
// ---------------------------------------------------------------------------

const GAP_WORLD = 100; // distance from rightmost object to the table
const ROW_H = 25;
const HEADER_H = 26;
const FONT = 12;
const PAD_X = 8;
const RADIUS = 7;
const SWATCH = 9; // layer colour chip
const INDENT = 22; // detail rows are indented under their wall (room for swatch)

// `min` is a floor; each column grows to fit its widest cell (see colWidths).
// `labelKey` is resolved against the active locale at render time.
const COLS = [
  { key: "type", labelKey: "drawingInfo.type", min: 70, align: "left" as const },
  { key: "length", labelKey: "drawingInfo.length", min: 70, align: "right" as const },
  { key: "width", labelKey: "drawingInfo.width", min: 70, align: "right" as const },
  { key: "height", labelKey: "drawingInfo.height", min: 70, align: "right" as const },
  { key: "area", labelKey: "drawingInfo.area", min: 70, align: "right" as const },
] satisfies { key: string; labelKey: TranslationKey; min: number; align: "left" | "right" }[];

const ADD_BTN_W = 56; // ＋ Layer button on a side row
const REMOVE_W = 18; // × button reserved at the right of a layer row

// Text measurement (Konva's default font is Arial) so columns can fit content.
const FONT_FAMILY = "Arial";
let measureCtx: CanvasRenderingContext2D | null = null;
const textWidth = (text: string, size = FONT, bold = false, letterSpacing = 0): number => {
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  if (!measureCtx) return text.length * size * 0.6; // no-canvas fallback
  measureCtx.font = `${bold ? "bold " : ""}${size}px ${FONT_FAMILY}`;
  return measureCtx.measureText(text).width + Math.max(0, text.length - 1) * letterSpacing;
};

const PANEL_BG = "#ffffff";
const PANEL_STROKE = "#e4e4e7";
const HEADER_BG = "#fafafa";
const HEADER_TEXT = "#71717a";
const HEADER_BORDER = "#d4d4d8";
const ROW_ALT = "#fbfbfc";
const TEXT = "#27272a";
const MUTED = "#71717a";
const GRID = "#efeff1";
const SELECT_BG = "#e0f2fe"; // sky-100: highlighted (selected) row
const ACCENT = "#0284c7"; // sky-600: selection accent + add affordance
const DETAIL_BG = "#f6f8fb"; // slate-ish: master→detail layer band
const DANGER = "#ef4444";
const SWATCH_STROKE = "#0000001a"; // 10% black, so light chips read on white

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

// ---------------------------------------------------------------------------
// Render items: a flat, top-to-bottom list so master rows and their expanded
// layer detail rows share one simple y = HEADER_H + i * ROW_H layout.
// ---------------------------------------------------------------------------

type Item =
  | { kind: "shape"; row: DrawingRow; typeLabel: string }
  | { kind: "side"; wall: WallShape; side: WallSide } // side label + ＋ add
  // `type` keeps the raw material key (for the colour chip); `typeLabel` is its
  // localized display name.
  | { kind: "layer"; wall: WallShape; side: WallSide; layerId: string; type: string; typeLabel: string; width: string; area: string };

const select = (id: string) => {
  useSelectionStore.getState().selectShape(id);
  useToolsStore.setState({ tool: "select" }); // ensure selection is actionable
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DrawingInfoCanvas = () => {
  const { t, tf } = useTranslation();
  const shapes = useFloorPlanStore((s) => s.shapes);
  const updateShape = useFloorPlanStore((s) => s.updateShape);
  const unit = useEditorStore((s) => s.dimensionUnit);
  const ppm = useEditorStore((s) => s.pixelsPerMeter);
  const defaultWallHeight = useEditorStore((s) => s.defaultWallHeight);
  const selectedId = useSelectionStore((s) => s.selectedId);

  const sideLabel = (side: WallSide) => t(`wallSides.${side}`);
  const materialLabel = (name: string) => tf(`materials.${name.toLowerCase()}`, name);

  const rows = buildDrawingInfo(shapes, unit, ppm, defaultWallHeight);
  const anchor = tableAnchor(shapes);
  if (rows.length === 0 || anchor === null) return null;

  const selected = selectedId ? shapes[selectedId] : undefined;
  const selectedWall: WallShape | null = selected?.type === "wall" ? selected : null;

  const addLayer = (wall: WallShape, side: WallSide) =>
    updateShape(wall.id, { layers: withSideLayers(wall, side, [...layersOf(wall, side), createWallLayer()]) });
  const removeLayer = (wall: WallShape, side: WallSide, layerId: string) =>
    updateShape(wall.id, {
      layers: withSideLayers(wall, side, layersOf(wall, side).filter((l) => l.id !== layerId)),
    });

  // Flatten rows, expanding the selected wall into per-side layer detail rows.
  // Rooms are numbered in encounter order so "Room"/"Locale"/"Raum"/"اتاق" + n
  // reads correctly in every locale.
  const items: Item[] = [];
  let roomOrdinal = 0;
  for (const row of rows) {
    const typeLabel =
      row.kind === "room" ? `${t("drawingInfo.types.room")} ${++roomOrdinal}` : t(`drawingInfo.types.${row.kind}`);
    items.push({ kind: "shape", row, typeLabel });
    if (selectedWall && row.id === selectedWall.id) {
      for (const side of WALL_SIDES) {
        items.push({ kind: "side", wall: selectedWall, side });
        for (const lr of buildWallLayerRows(selectedWall, side, unit, ppm, defaultWallHeight)) {
          items.push({
            kind: "layer",
            wall: selectedWall,
            side,
            layerId: lr.id,
            type: lr.material,
            typeLabel: lr.material ? materialLabel(lr.material) : t("wallLayers.layer"),
            width: lr.widthDisplay,
            area: lr.areaDisplay,
          });
        }
      }
    }
  }

  const tableH = HEADER_H + items.length * ROW_H;

  // Per-row cells in column order (the localized type label leads the row).
  const cellsOf = (row: DrawingRow, typeLabel: string): DrawingCell[] => [
    { display: typeLabel },
    row.length,
    row.width,
    row.height,
    row.area,
  ];

  // Column widths: start at each column's floor, then grow to fit the widest
  // cell content so the panel sizes itself to the data instead of clipping it.
  const colW = COLS.map((c) => Math.max(c.min, textWidth(t(c.labelKey).toUpperCase(), FONT - 1, true, 0.4) + PAD_X * 2));
  const fit = (i: number, w: number) => (colW[i] = Math.max(colW[i], w));
  for (const it of items) {
    if (it.kind === "shape") {
      cellsOf(it.row, it.typeLabel).forEach((cell, i) => fit(i, textWidth(cell.display) + PAD_X * 2));
    } else if (it.kind === "side") {
      fit(0, textWidth(sideLabel(it.side)) + PAD_X * 2 + INDENT);
    } else {
      fit(0, textWidth(it.typeLabel) + PAD_X * 2 + INDENT);
      fit(2, textWidth(it.width) + PAD_X * 2);
      fit(4, textWidth(it.area) + PAD_X * 2 + REMOVE_W);
    }
  }
  // Reserve room on the right so a side row's ＋ button never overlaps its label.
  if (selectedWall) {
    const labelMax = Math.max(...WALL_SIDES.map((s) => textWidth(sideLabel(s)) + PAD_X + INDENT));
    const total = colW.reduce((s, w) => s + w, 0);
    const need = labelMax + 8 + ADD_BTN_W + 8;
    if (total < need) colW[colW.length - 1] += need - total;
  }
  const colLeft: number[] = [];
  const TABLE_W = colW.reduce((x, w, i) => ((colLeft[i] = x), x + w), 0);

  const cellText = (i: number, top: number, text: string, color: string, indent = 0) => (
    <Text
      key={i}
      x={colLeft[i] + PAD_X + indent}
      y={top + (ROW_H - FONT) / 2}
      width={colW[i] - PAD_X * 2 - indent}
      align={COLS[i].align}
      text={text}
      fontSize={FONT}
      fill={color}
      listening={false}
    />
  );

  // A transparent hit target that selects a shape row on tap.
  const hit = (top: number, onTap: () => void, width = TABLE_W) => {
    const tap = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      e.cancelBubble = true; // don't let the tap reach the drawing tools
      onTap();
    };
    return (
      <Rect x={0} y={top} width={width} height={ROW_H} fill="transparent" onMouseDown={tap} onTouchStart={tap} />
    );
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
        strokeWidth={1}
        cornerRadius={RADIUS}
        shadowColor="#1e293b"
        shadowOpacity={0.16}
        shadowBlur={14}
        shadowOffsetY={4}
        listening={false}
      />

      {/* Header */}
      <Rect x={0} y={0} width={TABLE_W} height={HEADER_H} fill={HEADER_BG} cornerRadius={[RADIUS, RADIUS, 0, 0]} listening={false} />
      <Line points={[0, HEADER_H, TABLE_W, HEADER_H]} stroke={HEADER_BORDER} strokeWidth={1} listening={false} />
      {COLS.map((c, i) => (
        <Text
          key={`h-${c.key}`}
          x={colLeft[i] + PAD_X}
          y={(HEADER_H - (FONT - 1)) / 2}
          width={colW[i] - PAD_X * 2}
          align={c.align}
          text={t(c.labelKey).toUpperCase()}
          fontSize={FONT - 1}
          fontStyle="bold"
          letterSpacing={0.4}
          fill={HEADER_TEXT}
          listening={false}
        />
      ))}

      {/* Rows */}
      {items.map((item, r) => {
        const top = HEADER_H + r * ROW_H;

        if (item.kind === "shape") {
          const { row } = item;
          const isSel = row.id === selectedId;
          const selectable = row.kind !== "room";
          const cells = cellsOf(row, item.typeLabel);
          return (
            <Group key={`row-${row.id}`}>
              {isSel ? (
                <Rect x={0} y={top} width={TABLE_W} height={ROW_H} fill={SELECT_BG} listening={false} />
              ) : (
                r % 2 === 1 && <Rect x={0} y={top} width={TABLE_W} height={ROW_H} fill={ROW_ALT} listening={false} />
              )}
              {isSel && <Rect x={0} y={top} width={2.5} height={ROW_H} fill={ACCENT} listening={false} />}
              <Line points={[0, top, TABLE_W, top]} stroke={GRID} strokeWidth={0.5} listening={false} />
              {cells.map((cell, i) => cellText(i, top, cell.display, i === 0 ? TEXT : MUTED))}
              {selectable && hit(top, () => select(row.id))}
            </Group>
          );
        }

        if (item.kind === "side") {
          const onAdd = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
            e.cancelBubble = true;
            addLayer(item.wall, item.side);
          };
          return (
            <Group key={`side-${item.side}`}>
              <Rect x={0} y={top} width={TABLE_W} height={ROW_H} fill={DETAIL_BG} listening={false} />
              <Line points={[0, top, TABLE_W, top]} stroke={GRID} strokeWidth={0.5} listening={false} />
              {cellText(0, top, sideLabel(item.side), HEADER_TEXT, INDENT)}
              {/* ＋ Layer — one-tap add for this face */}
              <Rect
                x={TABLE_W - 64}
                y={top + 3}
                width={56}
                height={ROW_H - 6}
                fill="#ffffff"
                stroke={ACCENT}
                strokeWidth={0.75}
                cornerRadius={3}
                onMouseDown={onAdd}
                onTouchStart={onAdd}
              />
              <Text
                x={TABLE_W - 64}
                y={top + (ROW_H - FONT) / 2}
                width={56}
                align="center"
                text={`＋ ${t("drawingInfo.addLayer")}`}
                fontSize={FONT - 1}
                fontStyle="bold"
                fill={ACCENT}
                listening={false}
              />
            </Group>
          );
        }

        // item.kind === "layer"
        const onRemove = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
          e.cancelBubble = true;
          removeLayer(item.wall, item.side, item.layerId);
        };
        return (
          <Group key={`layer-${item.layerId}`}>
            <Rect x={0} y={top} width={TABLE_W} height={ROW_H} fill={DETAIL_BG} listening={false} />
            <Line points={[0, top, TABLE_W, top]} stroke={GRID} strokeWidth={0.5} listening={false} />
            {/* material colour chip */}
            <Rect
              x={colLeft[0] + PAD_X + 4}
              y={top + (ROW_H - SWATCH) / 2}
              width={SWATCH}
              height={SWATCH}
              fill={materialColor(item.type)}
              stroke={SWATCH_STROKE}
              strokeWidth={1}
              cornerRadius={2}
              listening={false}
            />
            {cellText(0, top, item.typeLabel, TEXT, INDENT)}
            {cellText(2, top, item.width, MUTED)}
            {/* area — narrowed to clear the × button on the right */}
            <Text
              x={colLeft[4] + PAD_X}
              y={top + (ROW_H - FONT) / 2}
              width={colW[4] - PAD_X * 2 - REMOVE_W}
              align="right"
              text={item.area}
              fontSize={FONT}
              fill={MUTED}
              listening={false}
            />
            {/* × remove */}
            <Rect
              x={TABLE_W - 20}
              y={top + 3}
              width={ROW_H - 6}
              height={ROW_H - 6}
              fill="transparent"
              onMouseDown={onRemove}
              onTouchStart={onRemove}
            />
            <Text
              x={TABLE_W - 20}
              y={top + (ROW_H - FONT) / 2}
              width={ROW_H - 6}
              align="center"
              text="✕"
              fontSize={FONT}
              fill={DANGER}
              listening={false}
            />
          </Group>
        );
      })}
    </Group>
  );
};

export default DrawingInfoCanvas;
