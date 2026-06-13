import Sidebar from "./sidebar";
import GlobalCursor from "./sidebar/GlobalCursor";
import WallActions from "./WallActions";
import DrawingInfoPanel from "./DrawingInfoPanel";

const Layout = () => {
  return (
    <>
      <GlobalCursor />

      <Sidebar />

      <WallActions />

      <DrawingInfoPanel />
    </>
  );
};

export default Layout;
