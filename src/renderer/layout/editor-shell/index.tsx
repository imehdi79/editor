/**
 * EditorShell — the desktop CAD chrome (md+) that floats over the full-bleed
 * canvas: the left tool rail, the floating view controls, the right inspector,
 * and the bottom status bar. Each piece is `hidden md:flex`, so on phones the
 * mobile toolbar + modals take over and this renders nothing.
 */

import ToolRail from "./ToolRail";
import ViewControls from "./ViewControls";
import Inspector from "./Inspector";
import StatusBar from "./StatusBar";
import Rulers from "./Rulers";

const EditorShell = () => (
  <>
    <ToolRail />
    <Rulers />
    <ViewControls />
    <Inspector />
    <StatusBar />
  </>
);

export default EditorShell;
