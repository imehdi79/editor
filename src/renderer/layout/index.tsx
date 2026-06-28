import GlobalCursor from "./sidebar/GlobalCursor";
import WallActions from "./WallActions";
import Header from "./header";
import SubPageBar from "./header/SubPageBar";
import MobileToolbar from "./MobileToolbar";

const Layout = () => {
  return (
    <>
      <GlobalCursor />

      <Header />
      <SubPageBar />

      <WallActions />

      <MobileToolbar />
    </>
  );
};

export default Layout;
