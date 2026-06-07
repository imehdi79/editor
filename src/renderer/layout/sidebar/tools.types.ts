export type Tools = "wall" | "line" | "dashed-line" | "text" | "select" | "redo" | "undo" | null;
export type OneClickTools = Extract<Tools, "redo" | "undo" | null>;
export type NoOneClickTools = Exclude<Tools, OneClickTools | null>;

export type SideBarToolsListItem = {
  icon: React.ReactNode;
  label: string;
};

export type SideBarToolsList<P extends Tools> = { [key in NonNullable<P>]: SideBarToolsListItem };
