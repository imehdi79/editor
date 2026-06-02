export type Tools = "pen" | null;

export type SideBarToolsListItem = {
  icon: React.ReactNode;
};

export type SideBarToolsList<P extends Tools> = { [key in NonNullable<P>]: SideBarToolsListItem };
