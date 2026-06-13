/**
 * DrawingInfoPanel — editable, DOM-based drawing-information / takeoff table.
 *
 * Replaces the old read-only on-canvas table. One row per shape; numeric cells
 * are inputs that commit straight to the owning shape via the floor-plan store
 * (one undo entry each). Derived cells (Area, Room rows) are read-only. Floats
 * as a collapsible card in the top-right corner.
 *
 * Edit semantics (all in the current display unit; height in cm):
 *   length    — keep p1 fixed, move p2 along the segment to the new length
 *   thickness — set the wall/opening thickness
 *   width     — resize an opening symmetrically about its center along the wall
 *   height    — set the wall height (real units; no 2D effect)
 */

import { useState } from "react";
import { Table2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useEditorStore } from "@/store/editor.store";
import { buildDrawingInfo, type DrawingRow, type DrawingCell, type EditField } from "@/core/drawing-info/buildDrawingInfo";
import { toPx } from "@/core/dimensions/dimensionUnits";

const EditableCell = ({ cell, onCommit }: { cell: DrawingCell; onCommit: (v: number) => void }) => {
  const [draft, setDraft] = useState<string | null>(null);

  if (cell.field === undefined || cell.value === undefined) {
    return <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">{cell.display}</td>;
  }

  const commit = () => {
    if (draft === null) return;
    const n = Number(draft);
    if (!Number.isNaN(n)) onCommit(n);
    setDraft(null);
  };

  return (
    <td className="px-1 py-0.5 text-right">
      <input
        type="number"
        value={draft ?? String(cell.value)}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            commit();
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            setDraft(null);
            e.currentTarget.blur();
          }
        }}
        className="h-6 w-full min-w-14 rounded border bg-background px-1.5 text-right text-[11px] tabular-nums outline-none focus-visible:border-ring"
      />
    </td>
  );
};

const DrawingInfoPanel = () => {
  const shapes = useFloorPlanStore((s) => s.shapes);
  const updateShape = useFloorPlanStore((s) => s.updateShape);
  const unit = useEditorStore((s) => s.dimensionUnit);
  const ppm = useEditorStore((s) => s.pixelsPerMeter);
  const defaultWallHeight = useEditorStore((s) => s.defaultWallHeight);

  const [open, setOpen] = useState(true);

  const rows = buildDrawingInfo(shapes, unit, ppm, defaultWallHeight);
  if (rows.length === 0) return null;

  const applyEdit = (row: DrawingRow, field: EditField, valueInUnit: number) => {
    const s = shapes[row.id];
    if (!s || s.type === "text") return;

    if (field === "height") {
      updateShape(s.id, { height: Math.max(1, valueInUnit) });
      return;
    }

    const px = Math.max(1, toPx(valueInUnit, unit, ppm));

    if (field === "thickness") {
      updateShape(s.id, { thickness: px });
    } else if (field === "length" && (s.type === "wall" || s.type === "line" || s.type === "dashed-line")) {
      const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1) || 1;
      const ux = (s.x2 - s.x1) / len;
      const uy = (s.y2 - s.y1) / len;
      updateShape(s.id, { x2: s.x1 + ux * px, y2: s.y1 + uy * px });
    } else if (field === "width" && (s.type === "window" || s.type === "door")) {
      const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1) || 1;
      const ux = (s.x2 - s.x1) / len;
      const uy = (s.y2 - s.y1) / len;
      const cx = (s.x1 + s.x2) / 2;
      const cy = (s.y1 + s.y2) / 2;
      updateShape(s.id, {
        x1: cx - ux * (px / 2),
        y1: cy - uy * (px / 2),
        x2: cx + ux * (px / 2),
        y2: cy + uy * (px / 2),
        width: px,
      });
    }
  };

  return (
    <div className="fixed top-4 right-4 z-40 w-72 overflow-hidden rounded-xl border bg-popover shadow-2xl">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs font-medium">
          <Table2 size={14} /> Drawing info
        </span>
        <Button size="icon-xs" variant="ghost" title={open ? "Collapse" : "Expand"} onClick={() => setOpen((v) => !v)}>
          <ChevronDown size={14} className={open ? "" : "-rotate-90"} />
        </Button>
      </div>

      {open && (
        <div className="max-h-[60svh] overflow-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead className="sticky top-0 bg-muted/95 text-muted-foreground">
              <tr>
                <th className="px-2 py-1 text-left font-medium">Type</th>
                <th className="px-2 py-1 text-right font-medium">Length</th>
                <th className="px-2 py-1 text-right font-medium">Width</th>
                <th className="px-2 py-1 text-right font-medium">Height</th>
                <th className="px-2 py-1 text-right font-medium">Area</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t even:bg-muted/30">
                  <td className="px-2 py-1 text-left whitespace-nowrap">{row.type}</td>
                  <EditableCell cell={row.length} onCommit={(v) => applyEdit(row, row.length.field!, v)} />
                  <EditableCell cell={row.width} onCommit={(v) => applyEdit(row, row.width.field!, v)} />
                  <EditableCell cell={row.height} onCommit={(v) => applyEdit(row, row.height.field!, v)} />
                  <EditableCell cell={row.area} onCommit={() => {}} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DrawingInfoPanel;
