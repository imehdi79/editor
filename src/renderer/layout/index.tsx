import Sidebar from "./sidebar";
import GlobalCursor from "./sidebar/GlobalCursor";
import WallActions from "./WallActions";
import Header from "./header";
import SubPageBar from "./header/SubPageBar";

const Layout = () => {
  return (
    <>
      <GlobalCursor />

      <Header />
      <SubPageBar />

      <Sidebar />

      <WallActions />
    </>
  );
};

export default Layout;
