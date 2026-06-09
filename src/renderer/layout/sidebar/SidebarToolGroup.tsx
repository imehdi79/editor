import type { SideBarToolsList, Tools } from "./tools.types";
import SidebarToolButton from "./SidebarToolButton";

type Props<T extends Tools> = {
  tools: SideBarToolsList<T>;
};

const SidebarToolGroup = <T extends Tools>({ tools }: Props<T>) => {
  return (
    <div className="flex flex-col gap-0.5 bg-popover p-1 rounded-lg border shadow-2xl">
      {(Object.entries(tools) as [NonNullable<T>, SideBarToolsList<T>[NonNullable<T>]][]).map(
        ([tool, props]) => (
          <SidebarToolButton key={tool} tool={tool as Tools} {...props} />
        )
      )}
    </div>
  );
};

export default SidebarToolGroup;