import C2D from "@/renderer/2d";
import C3D from "@/renderer/3d";
import { useEditorStore } from "@/store/editor.store";

const Canvas = () => {
  const viewMode = useEditorStore((s) => s.viewMode);
  return viewMode === "2d" ? <C2D /> : <C3D />;
};

export default Canvas;
