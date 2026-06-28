import GlobalCursor from "./sidebar/GlobalCursor";
import WallActions from "./WallActions";
import Header from "./header";
import SubPageBar from "./header/SubPageBar";
import MobileToolbar from "./MobileToolbar";
import EditorShell from "./editor-shell";

const Layout = () => {
  return (
    <>
      <GlobalCursor />

      <Header />
      <SubPageBar />

      {/* Desktop CAD chrome (md+) — tool rail, view controls, inspector, status bar */}
      <EditorShell />

      {/* Mobile chrome — wall editor modal + tool sheet (hidden on md+) */}
      <WallActions />
      <MobileToolbar />
    </>
  );
};

export default Layout;
