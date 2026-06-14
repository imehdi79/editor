import Sidebar from "./sidebar";
import GlobalCursor from "./sidebar/GlobalCursor";
import WallActions from "./WallActions";
import DrawingInfoEditOverlay from "./DrawingInfoEditOverlay";

const Layout = () => {
  return (
    <>
      <GlobalCursor />

      <Sidebar />

      <WallActions />

      <DrawingInfoEditOverlay />
    </>
  );
};

export default Layout;
