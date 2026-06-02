import Sidebar from "./sidebar";
import GlobalCursor from "./sidebar/GlobalCursor";

const Layout = () => {
  return (
    <>
      <GlobalCursor />

      <Sidebar />
    </>
  );
};

export default Layout;
