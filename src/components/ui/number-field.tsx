/**
 * NumberField — a labelled numeric input used across the wall/settings panels.
 *
 * It keeps a local *draft* string so the field can be emptied and retyped. A
 * naively-controlled `value={number}` input rejects the empty/intermediate state
 * (clearing it snaps straight back to the old number), which makes "delete then
 * type a new value" impossible on touch. Here every keystroke updates the draft,
 * valid values (≥ min) commit live via `onChange`, and an empty/invalid field
 * reverts to the committed value on blur.
 */

import { useEffect, useState } from "react";

interface Props {
  label: string;
  value: number;
  min: number;
  step: number;
  suffix: string;
  onChange: (v: number) => void;
}

export const NumberField = ({ label, value, min, step, suffix, onChange }: Props) => {
  const [draft, setDraft] = useState(() => String(value));
  const [editing, setEditing] = useState(false);

  // Reflect external value changes (undo, other edits) while not being edited.
  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  return (
    <label className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1">
        <input
          type="number"
          min={min}
          step={step}
          value={draft}
          onFocus={() => setEditing(true)}
          onChange={(e) => {
            setDraft(e.target.value);
            const v = Number(e.target.value);
            if (e.target.value.trim() !== "" && !Number.isNaN(v) && v >= min) onChange(v);
          }}
          onBlur={(e) => {
            setEditing(false);
            const v = Number(e.target.value);
            // Revert an empty / invalid / below-min field to the committed value.
            if (e.target.value.trim() === "" || Number.isNaN(v) || v < min) setDraft(String(value));
          }}
          className="h-7 w-16 rounded-md border bg-background px-2 text-right text-xs outline-none focus-visible:border-ring"
        />
        <span className="w-5 text-muted-foreground">{suffix}</span>
      </span>
    </label>
  );
};

export default NumberField;
