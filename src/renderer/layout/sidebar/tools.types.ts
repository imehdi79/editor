export type Tools = "wall" | "line" | "dashed-line" | "text" | null;

export type SideBarToolsListItem = {
  icon: React.ReactNode;
  label: string;
};

export type SideBarToolsList<P extends Tools> = { [key in NonNullable<P>]: SideBarToolsListItem };
