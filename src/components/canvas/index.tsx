import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import C2D from "@/renderer/2d";
import { useEditorStore } from "@/store/editor.store";

// The 3D view pulls in three.js + @react-three/drei + three-stdlib — roughly
// half the JS bundle. The app is mobile-first and boots in 2D, so defer loading
// the whole 3D stack until the user actually switches to it. This keeps it out
// of the initial (mobile) download entirely.
const C3D = lazy(() => import("@/renderer/3d"));

const Fallback = () => (
  <div className="flex h-full w-full items-center justify-center">
    <Loader2 className="size-6 animate-spin text-muted-foreground" />
  </div>
);

const Canvas = () => {
  const viewMode = useEditorStore((s) => s.viewMode);
  if (viewMode === "2d") return <C2D />;
  return (
    <Suspense fallback={<Fallback />}>
      <C3D />
    </Suspense>
  );
};

export default Canvas;
