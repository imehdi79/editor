import SidebarTools from "./SidebarTools";

const Sidebar = () => {
  return (
    <div className="absolute top-3 left-3 p-1.5 z-50 rounded-md bg-popover border shadow-2xl">
      <SidebarTools />
    </div>
  );
};

export default Sidebar;
