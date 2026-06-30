import GlobalCursor from "./sidebar/GlobalCursor";
import SelectionActions from "./SelectionActions";
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

      {/* Mobile chrome — selection editor modal + tool sheet (hidden on md+) */}
      <SelectionActions />
      <MobileToolbar />
    </>
  );
};

export default Layout;
