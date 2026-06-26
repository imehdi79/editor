/**
 * PricingTableCanvas — on-canvas cost-takeoff table, a world-space Konva object
 * (mobile-first: it lives on the canvas and pans/zooms with the plan).
 *
 * One row per wall: its billing status (new / existing / demolish), quantity and
 * total cost. The selected wall expands master→detail into its priced
 * construction layers, plus a demolition line when scheduled for demolition. A
 * footer row shows the grand total. Anchored to the LEFT of the plan so it never
 * collides with the right-anchored drawing-info table.
 *
 * Read-only except selection: tapping a wall row selects it (like the takeoff).
 * Gated behind pricing.store.showPricingTable.
 */

import { Group, Rect, Text, Line } from "react-konva";
import type Konva from "konva";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useEditorStore } from "@/store/editor.store";
import { useToolsStore } from "@/store/tools.store";
import { useSelectionStore } from "@/store/selection.store";
import { usePricingStore } from "@/store/pricing.store";
import type { Shape, WallShape, ArcWallShape } from "@/core/drawing-engine/drawing.types";
import {
  computePricingTakeoff,
  formatMoney,
  formatQuantity,
  type WallPricing,
} from "@/core/pricing/computeWallPricing";
import { materialColor } from "@/core/wall-layers/wallLayers";
import { useTranslation, type TranslationKey } from "@/i18n";

// ---------------------------------------------------------------------------
// Layout (world px) & palette — mirrors DrawingInfoCanvas.
// ---------------------------------------------------------------------------

const GAP_WORLD = 100;
const ROW_H = 25;
const HEADER_H = 26;
const FONT = 12;
const PAD_X = 8;
const RADIUS = 7;
const SWATCH = 9;
const INDENT = 22;
const CORE_DOT = "#1e293b";

const COLS = [
  { key: "item", labelKey: "pricing.table.item", min: 90, align: "left" as const },
  { key: "status", labelKey: "pricing.table.status", min: 70, align: "left" as const },
  { key: "qty", labelKey: "pricing.table.qty", min: 70, align: "right" as const },
  { key: "cost", labelKey: "pricing.table.cost", min: 96, align: "right" as const },
] satisfies { key: string; labelKey: TranslationKey; min: number; align: "left" | "right" }[];

const FONT_FAMILY = "Arial";
let measureCtx: CanvasRenderingContext2D | null = null;
const textWidth = (text: string, size = FONT, bold = false, letterSpacing = 0): number => {
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  if (!measureCtx) return text.length * size * 0.6;
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
const SELECT_BG = "#e0f2fe";
const ACCENT = "#0284c7";
const DETAIL_BG = "#f6f8fb";
const SWATCH_STROKE = "#0000001a";
const TOTAL_BG = "#f1f5f9"; // slate-100 — footer total row
const STATUS_EXISTING = "#b45309"; // amber-700
const STATUS_DEMOLISH = "#dc2626"; // red-600

// ---------------------------------------------------------------------------
// Anchor: top-left, placed to the LEFT of the leftmost object.
// ---------------------------------------------------------------------------

const leftTopOfPlan = (shapes: Record<string, Shape>): { left: number; top: number } | null => {
  let left = Infinity;
  let top = Infinity;
  for (const s of Object.values(shapes)) {
    if (s.type === "text") {
      left = Math.min(left, s.x);
      top = Math.min(top, s.y);
      continue;
    }
    const half = s.type === "wall" || s.type === "window" || s.type === "door" ? s.thickness / 2 : 0;
    const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1) || 1;
    const perpX = (Math.abs(s.y2 - s.y1) / len) * half;
    const perpY = (Math.abs(s.x2 - s.x1) / len) * half;
    left = Math.min(left, s.x1 - perpX, s.x2 - perpX);
    top = Math.min(top, s.y1 - perpY, s.y2 - perpY);
  }
  if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
  return { left, top };
};

// ---------------------------------------------------------------------------
// Flat render-item list.
// ---------------------------------------------------------------------------

type Item =
  | { kind: "wall"; id: string; label: string; statusLabel: string; statusColor: string; qty: string; cost: string }
  | { kind: "layer"; layerId: string; material: string; label: string; qty: string; cost: string; isCore: boolean }
  | { kind: "demolish"; label: string; qty: string; cost: string }
  | { kind: "total"; label: string; cost: string };

const select = (id: string) => {
  useSelectionStore.getState().selectShape(id);
  useToolsStore.setState({ tool: "select" });
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const PricingTableCanvas = () => {
  const { t, tf } = useTranslation();
  const shapes = useFloorPlanStore((s) => s.shapes);
  const ppm = useEditorStore((s) => s.pixelsPerMeter);
  const defaultWallHeight = useEditorStore((s) => s.defaultWallHeight);
  const selectedId = useSelectionStore((s) => s.selectedId);
  const show = usePricingStore((s) => s.showPricingTable);
  const currency = usePricingStore((s) => s.currency);
  const rates = usePricingStore((s) => s.rates);
  const demolishRate = usePricingStore((s) => s.demolishRate);

  const materialLabel = (name: string) => tf(`materials.${name.toLowerCase()}`, name);
  const unitSymbol = (u: string) => t(`pricingUnitSymbol.${u}` as TranslationKey);

  const takeoff = computePricingTakeoff(shapes, rates, demolishRate, ppm, defaultWallHeight);
  const anchor = leftTopOfPlan(shapes);
  if (!show || takeoff.walls.length === 0 || anchor === null) return null;

  const selected = selectedId ? shapes[selectedId] : undefined;
  const selectedWall: WallShape | ArcWallShape | null =
    selected?.type === "wall" || selected?.type === "arc-wall" ? selected : null;

  const statusOf = (w: WallPricing): { label: string; color: string } => {
    if (w.demolish) return { label: t("pricing.status.demolish"), color: STATUS_DEMOLISH };
    if (w.existing) return { label: t("pricing.status.existing"), color: STATUS_EXISTING };
    return { label: t("pricing.status.new"), color: MUTED };
  };

  // Build the flat row list; expand the selected wall into its priced layers.
  const items: Item[] = [];
  takeoff.walls.forEach((w, i) => {
    const status = statusOf(w);
    items.push({
      kind: "wall",
      id: w.wallId,
      label: `${t("drawingInfo.types.wall")} ${i + 1}`,
      statusLabel: status.label,
      statusColor: status.color,
      qty: `${formatQuantity(w.areaM2)} ${unitSymbol("area")}`,
      cost: formatMoney(w.total, currency),
    });
    if (selectedWall && w.wallId === selectedWall.id) {
      for (const l of w.layers) {
        items.push({
          kind: "layer",
          layerId: l.layerId,
          material: l.material,
          label: l.material ? materialLabel(l.material) : t(`layerFunction.${l.function}`),
          qty: `${formatQuantity(l.quantity)} ${unitSymbol(l.unit)}`,
          cost: formatMoney(l.cost, currency),
          isCore: l.isCore,
        });
      }
      if (w.demolish) {
        items.push({
          kind: "demolish",
          label: t("wall.demolition"),
          qty: `${formatQuantity(w.areaM2)} ${unitSymbol("area")}`,
          cost: formatMoney(w.demolishCost, currency),
        });
      }
    }
  });
  items.push({ kind: "total", label: t("pricing.table.total"), cost: formatMoney(takeoff.total, currency) });

  const tableH = HEADER_H + items.length * ROW_H;

  // Column widths: start at each floor, grow to fit the widest cell.
  const colW = COLS.map((c) => Math.max(c.min, textWidth(t(c.labelKey).toUpperCase(), FONT - 1, true, 0.4) + PAD_X * 2));
  const fit = (i: number, w: number) => (colW[i] = Math.max(colW[i], w));
  for (const it of items) {
    if (it.kind === "wall") {
      fit(0, textWidth(it.label) + PAD_X * 2);
      fit(1, textWidth(it.statusLabel) + PAD_X * 2);
      fit(2, textWidth(it.qty) + PAD_X * 2);
      fit(3, textWidth(it.cost) + PAD_X * 2);
    } else if (it.kind === "layer" || it.kind === "demolish") {
      fit(0, textWidth(it.label) + PAD_X * 2 + INDENT);
      fit(2, textWidth(it.qty) + PAD_X * 2);
      fit(3, textWidth(it.cost) + PAD_X * 2);
    } else {
      fit(0, textWidth(it.label, FONT, true) + PAD_X * 2);
      fit(3, textWidth(it.cost, FONT, true) + PAD_X * 2);
    }
  }
  const colLeft: number[] = [];
  const TABLE_W = colW.reduce((x, w, i) => ((colLeft[i] = x), x + w), 0);

  // Anchor to the left of the plan: right edge sits GAP_WORLD before leftmost x.
  const originX = anchor.left - GAP_WORLD - TABLE_W;
  const originY = anchor.top;

  const cellText = (i: number, top: number, text: string, color: string, indent = 0, bold = false) => (
    <Text
      key={i}
      x={colLeft[i] + PAD_X + indent}
      y={top + (ROW_H - FONT) / 2}
      width={colW[i] - PAD_X * 2 - indent}
      align={COLS[i].align}
      text={text}
      fontSize={FONT}
      fontStyle={bold ? "bold" : "normal"}
      fill={color}
      listening={false}
    />
  );

  const hit = (top: number, onTap: () => void) => {
    const tap = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      e.cancelBubble = true;
      onTap();
    };
    return <Rect x={0} y={top} width={TABLE_W} height={ROW_H} fill="transparent" onMouseDown={tap} onTouchStart={tap} />;
  };

  return (
    <Group x={originX} y={originY}>
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

        if (item.kind === "wall") {
          const isSel = item.id === selectedId;
          return (
            <Group key={`wall-${item.id}`}>
              {isSel ? (
                <Rect x={0} y={top} width={TABLE_W} height={ROW_H} fill={SELECT_BG} listening={false} />
              ) : (
                r % 2 === 1 && <Rect x={0} y={top} width={TABLE_W} height={ROW_H} fill={ROW_ALT} listening={false} />
              )}
              {isSel && <Rect x={0} y={top} width={2.5} height={ROW_H} fill={ACCENT} listening={false} />}
              <Line points={[0, top, TABLE_W, top]} stroke={GRID} strokeWidth={0.5} listening={false} />
              {cellText(0, top, item.label, TEXT)}
              {cellText(1, top, item.statusLabel, item.statusColor)}
              {cellText(2, top, item.qty, MUTED)}
              {cellText(3, top, item.cost, TEXT)}
              {hit(top, () => select(item.id))}
            </Group>
          );
        }

        if (item.kind === "total") {
          return (
            <Group key="total" listening={false}>
              <Rect x={0} y={top} width={TABLE_W} height={ROW_H} fill={TOTAL_BG} cornerRadius={[0, 0, RADIUS, RADIUS]} listening={false} />
              <Line points={[0, top, TABLE_W, top]} stroke={HEADER_BORDER} strokeWidth={1} listening={false} />
              {cellText(0, top, item.label, TEXT, 0, true)}
              {cellText(3, top, item.cost, ACCENT, 0, true)}
            </Group>
          );
        }

        // Demolition — read-only detail line under an existing demolished wall.
        if (item.kind === "demolish") {
          return (
            <Group key={`demo-${top}`} listening={false}>
              <Rect x={0} y={top} width={TABLE_W} height={ROW_H} fill={DETAIL_BG} listening={false} />
              <Line points={[0, top, TABLE_W, top]} stroke={GRID} strokeWidth={0.5} listening={false} />
              {cellText(0, top, item.label, STATUS_DEMOLISH, INDENT)}
              {cellText(2, top, item.qty, MUTED)}
              {cellText(3, top, item.cost, STATUS_DEMOLISH)}
            </Group>
          );
        }

        // layer — read-only priced assembly detail row.
        return (
          <Group key={`layer-${item.layerId}`} listening={false}>
            <Rect x={0} y={top} width={TABLE_W} height={ROW_H} fill={DETAIL_BG} listening={false} />
            <Line points={[0, top, TABLE_W, top]} stroke={GRID} strokeWidth={0.5} listening={false} />
            <Rect
              x={colLeft[0] + PAD_X + 4}
              y={top + (ROW_H - SWATCH) / 2}
              width={SWATCH}
              height={SWATCH}
              fill={item.material ? materialColor(item.material) : CORE_DOT}
              stroke={SWATCH_STROKE}
              strokeWidth={1}
              cornerRadius={2}
              listening={false}
            />
            {cellText(0, top, item.label, item.isCore ? TEXT : MUTED, INDENT)}
            {cellText(2, top, item.qty, MUTED)}
            {cellText(3, top, item.cost, MUTED)}
          </Group>
        );
      })}
    </Group>
  );
};

export default PricingTableCanvas;
