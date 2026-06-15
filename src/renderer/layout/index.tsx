import Sidebar from "./sidebar";
import GlobalCursor from "./sidebar/GlobalCursor";
import WallActions from "./WallActions";
import DrawingInfoEditOverlay from "./DrawingInfoEditOverlay";
import Header from "./header";

const Layout = () => {
  return (
    <>
      <GlobalCursor />

      <Header />

      <Sidebar />

      <WallActions />

      <DrawingInfoEditOverlay />
    </>
  );
};

export default Layout;
