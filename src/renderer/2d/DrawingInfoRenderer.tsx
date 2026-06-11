/**
 * DrawingInfoRenderer — CAD-style drawing information table rendered on canvas.
 * Automatically positioned TABLE_OFFSET px to the right of all drawing content.
 * Stays in world space so it scales and pans with the drawing.
 */

import { useMemo } from "react";
import { Group, Rect, Text, Line } from "react-konva";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useEditorStore } from "@/store/editor.store";
import { buildDrawingInfo } from "@/core/drawing-info/buildDrawingInfo";

const TABLE_OFFSET = 60; // px right of rightmost shape
const COL_TYPE = 90;
const COL_LEN = 80;
const COL_WID = 80;
const COL_QTY = 40;
const TOTAL_W = COL_TYPE + COL_LEN + COL_WID + COL_QTY;
const ROW_H = 22;
const HEADER_H = 26;
const PAD = 6;
const FONT_SZ = 10;
const HEADER_FONT_SZ = 10;

const BORDER = "#475569";
const HEADER_BG = "#1e293b";
const HEADER_FG = "#f8fafc";
const ROW_EVEN = "#f8fafc";
const ROW_ODD = "#f1f5f9";
const TEXT_COLOR = "#1e293b";

const COLS = [
  { label: "Type", w: COL_TYPE },
  { label: "Length", w: COL_LEN },
  { label: "Width", w: COL_WID },
  { label: "Qty", w: COL_QTY },
];

const DrawingInfoRenderer = () => {
  const shapes = useFloorPlanStore((s) => s.shapes);
  const unit = useEditorStore((s) => s.dimensionUnit);
  const ppm = useEditorStore((s) => s.pixelsPerMeter);
  const reference = useEditorStore((s) => s.measurementReference);

  const info = useMemo(() => buildDrawingInfo(shapes, unit, ppm, reference), [shapes, unit, ppm, reference]);

  if (info.rows.length === 0) return null;

  const tableX = info.rightmostX + TABLE_OFFSET;
  const tableY = 20;
  const totalH = HEADER_H + info.rows.length * ROW_H + 1;

  return (
    <Group x={tableX} y={tableY} listening={false}>
      {/* Outer border */}
      <Rect
        x={0}
        y={0}
        width={TOTAL_W}
        height={totalH}
        fill={ROW_EVEN}
        stroke={BORDER}
        strokeWidth={1}
        listening={false}
      />

      {/* Header row */}
      <Rect x={0} y={0} width={TOTAL_W} height={HEADER_H} fill={HEADER_BG} listening={false} />
      {
        COLS.reduce<{ x: number; els: React.ReactNode[] }>(
          (acc, col, i) => {
            acc.els.push(
              <Text
                key={`hdr-${i}`}
                x={acc.x + PAD}
                y={(HEADER_H - HEADER_FONT_SZ) / 2}
                text={col.label}
                fontSize={HEADER_FONT_SZ}
                fontFamily="monospace"
                fontStyle="bold"
                fill={HEADER_FG}
                listening={false}
              />,
            );
            if (i < COLS.length - 1)
              acc.els.push(
                <Line
                  key={`hv-${i}`}
                  points={[acc.x + col.w, 0, acc.x + col.w, HEADER_H]}
                  stroke="#334155"
                  strokeWidth={0.5}
                  listening={false}
                />,
              );
            acc.x += col.w;
            return acc;
          },
          { x: 0, els: [] },
        ).els
      }

      {/* Data rows */}
      {info.rows.map((row, ri) => {
        const ry = HEADER_H + ri * ROW_H;
        const bg = ri % 2 === 0 ? ROW_EVEN : ROW_ODD;
        const cells = [row.type, row.length, row.width, String(row.quantity)];
        let cx = 0;
        return (
          <Group key={ri} listening={false}>
            <Rect x={0} y={ry} width={TOTAL_W} height={ROW_H} fill={bg} listening={false} />
            {COLS.map((col, ci) => {
              const el = (
                <Group key={ci} listening={false}>
                  <Text
                    x={cx + PAD}
                    y={ry + (ROW_H - FONT_SZ) / 2}
                    text={cells[ci]}
                    fontSize={FONT_SZ}
                    fontFamily="monospace"
                    fill={TEXT_COLOR}
                    width={col.w - PAD * 2}
                    ellipsis
                    listening={false}
                  />
                  {ci < COLS.length - 1 && (
                    <Line
                      points={[cx + col.w, ry, cx + col.w, ry + ROW_H]}
                      stroke={BORDER}
                      strokeWidth={0.5}
                      opacity={0.4}
                      listening={false}
                    />
                  )}
                </Group>
              );
              cx += col.w;
              return el;
            })}
            <Line
              points={[0, ry + ROW_H, TOTAL_W, ry + ROW_H]}
              stroke={BORDER}
              strokeWidth={0.5}
              opacity={0.3}
              listening={false}
            />
          </Group>
        );
      })}
    </Group>
  );
};

export default DrawingInfoRenderer;
