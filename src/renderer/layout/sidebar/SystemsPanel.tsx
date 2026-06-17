/**
 * SystemsPanel — sidebar popover listing the discipline/system categories with
 * a per-category visibility toggle (the foundation of the layer system).
 *
 * Every shape belongs to a category (Architectural by default); hiding a
 * category removes its shapes from the canvas. Discipline tools (electrical,
 * plumbing, roof, …) will populate the currently-empty categories later.
 */

import { useState, useRef, useEffect } from "react";
import { Layers3, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLayersStore } from "@/store/layers.store";
import { SYSTEM_CATEGORIES } from "@/core/layers/systemCategories";

const SystemsPanel = () => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibility = useLayersStore((s) => s.visibility);
  const toggleCategory = useLayersStore((s) => s.toggleCategory);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <Button
        size="icon"
        variant={open ? "default" : "ghost"}
        title="Systems / layers"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <Layers3 size={16} />
      </Button>

      {open && (
        <div className="absolute left-full top-0 ml-2 z-50 flex w-56 flex-col gap-0.5 rounded-lg border bg-popover p-2 shadow-2xl">
          <span className="px-1 pb-1 text-xs text-muted-foreground">Systems</span>
          {SYSTEM_CATEGORIES.map((cat) => {
            const visible = visibility[cat.id];
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-accent"
                aria-pressed={visible}
              >
                <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: cat.color }} />
                <span
                  className={
                    visible
                      ? "flex-1 text-left text-foreground"
                      : "flex-1 text-left text-muted-foreground line-through"
                  }
                >
                  {cat.label}
                </span>
                {visible ? (
                  <Eye size={14} className="shrink-0 text-muted-foreground" />
                ) : (
                  <EyeOff size={14} className="shrink-0 text-muted-foreground" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SystemsPanel;
