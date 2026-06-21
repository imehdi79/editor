import type { ButtonVariant } from "@/components/ui/button";
import type { TranslationKey } from "@/i18n";

export type Tools =
  | "wall"
  | "arc-wall"
  | "line"
  | "dashed-line"
  | "text"
  | "select"
  | "redo"
  | "undo"
  | "delete"
  | "door"
  | "window"
  | null;
export type OneClickTools = Extract<Tools, "redo" | "undo" | "delete" | null>;
export type NoOneClickTools = Exclude<Tools, OneClickTools | null>;

export type SideBarToolsListItem = {
  icon: React.ReactNode;
  /** i18n key for the tool's label/tooltip, resolved at render. */
  labelKey: TranslationKey;
  variant?: ButtonVariant;
};

export type SideBarToolsList<P extends Tools> = { [key in NonNullable<P>]: SideBarToolsListItem };
