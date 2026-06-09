import type { ButtonVariant } from "@/components/ui/button";

export type Tools =
  | "wall"
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
  label: string;
  variant?: ButtonVariant;
};

export type SideBarToolsList<P extends Tools> = { [key in NonNullable<P>]: SideBarToolsListItem };
