/**
 * DrawingInfoEditOverlay — the HTML <input> half of the canvas drawing-info
 * table. The Konva table (DrawingInfoCanvas) can't host inputs, so when a cell
 * is tapped it publishes the cell's screen rect + field to drawingInfoEditStore;
 * this overlay renders an input there and commits via applyDrawingEdit.
 *
 * Lives in the DOM React tree (not the Konva tree) so it can render a real
 * <input>. Commits on Enter / blur, cancels on Escape.
 */

import { useEffect, useRef, useState } from "react";
import { useFloorPlanStore } from "@/store/floor-plan.store";
import { useEditorStore } from "@/store/editor.store";
import { useDrawingInfoEditStore } from "@/store/drawing-info-edit.store";
import { applyDrawingEdit } from "@/core/drawing-info/applyDrawingEdit";

const DrawingInfoEditOverlay = () => {
  const editing = useDrawingInfoEditStore((s) => s.editing);
  const clearEditing = useDrawingInfoEditStore((s) => s.clearEditing);
  const shapes = useFloorPlanStore((s) => s.shapes);
  const updateShape = useFloorPlanStore((s) => s.updateShape);
  const unit = useEditorStore((s) => s.dimensionUnit);
  const ppm = useEditorStore((s) => s.pixelsPerMeter);

  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(String(editing.value));
      // focus + select on next frame, after the input is positioned
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [editing]);

  if (!editing) return null;

  const commit = () => {
    const n = Number(draft);
    if (!Number.isNaN(n)) {
      applyDrawingEdit(shapes, updateShape, unit, ppm, editing.rowId, editing.field, n);
    }
    clearEditing();
  };

  return (
    <input
      ref={inputRef}
      type="number"
      inputMode="decimal"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          commit();
        } else if (e.key === "Escape") {
          clearEditing();
        }
      }}
      style={{
        position: "fixed",
        left: editing.x,
        top: editing.y,
        width: Math.max(editing.w, 56),
        height: Math.max(editing.h, 26),
      }}
      className="z-50 rounded border border-ring bg-background px-1.5 text-right text-[13px] tabular-nums shadow-lg outline-none"
    />
  );
};

export default DrawingInfoEditOverlay;
