/**
 * NumberField — a labelled numeric input used across the wall/settings panels.
 *
 * It uses a TEXT input (not `type="number"`) with a numeric `inputMode`, plus a
 * local *draft* string, so the field can be freely emptied and retyped. A
 * `type="number"` input reports an empty string for any intermediate value and
 * snaps a controlled value back on clear, which makes "delete then type a new
 * value" impossible (especially on touch). Here every keystroke updates the
 * draft, valid values (≥ min) commit live via `onChange`, and an empty/invalid
 * field reverts to the committed value on blur.
 */

import { useEffect, useState } from "react";

/** Allow only an optionally-signed decimal in progress (incl. "", "-", "."). */
const NUMERIC_DRAFT = /^-?\d*\.?\d*$/;

interface NumericInputProps {
  value: number;
  min: number;
  onChange: (v: number) => void;
  className?: string;
}

/**
 * Bare numeric text input with a draft string so it can be cleared and retyped
 * (a controlled `type="number"` snaps back on clear). Valid values (≥ min)
 * commit live; an empty/invalid field reverts on blur. Shared by NumberField and
 * inline table cells.
 */
export const NumericInput = ({ value, min, onChange, className }: NumericInputProps) => {
  const [draft, setDraft] = useState(() => String(value));
  const [editing, setEditing] = useState(false);

  // Reflect external value changes (undo, other edits) while not being edited.
  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  return (
    <input
      type="text"
      inputMode={min < 0 ? "text" : "decimal"}
      value={draft}
      onFocus={() => setEditing(true)}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw !== "" && !NUMERIC_DRAFT.test(raw)) return; // ignore non-numeric keystrokes
        setDraft(raw);
        const v = Number(raw);
        if (raw.trim() !== "" && !Number.isNaN(v) && v >= min) onChange(v);
      }}
      onBlur={(e) => {
        setEditing(false);
        const v = Number(e.target.value);
        // Revert an empty / invalid / below-min field to the committed value.
        if (e.target.value.trim() === "" || Number.isNaN(v) || v < min) setDraft(String(value));
      }}
      className={className}
    />
  );
};

interface Props {
  label: string;
  value: number;
  min: number;
  /** Kept for API compatibility; ignored by the text input. */
  step?: number;
  suffix: string;
  onChange: (v: number) => void;
}

export const NumberField = ({ label, value, min, suffix, onChange }: Props) => (
  <label className="flex items-center justify-between gap-2 text-xs">
    <span className="text-muted-foreground">{label}</span>
    <span className="flex items-center gap-1">
      <NumericInput
        value={value}
        min={min}
        onChange={onChange}
        className="h-7 w-16 rounded-md border bg-background px-2 text-right text-xs outline-none focus-visible:border-ring"
      />
      <span className="w-5 text-muted-foreground">{suffix}</span>
    </span>
  </label>
);

export default NumberField;
