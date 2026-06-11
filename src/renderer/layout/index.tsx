import Sidebar from "./sidebar";
import GlobalCursor from "./sidebar/GlobalCursor";
import WallActions from "./WallActions";

const Layout = () => {
  return (
    <>
      <GlobalCursor />

      <Sidebar />

      <WallActions />
    </>
  );
};

export default Layout;
