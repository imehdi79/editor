import { useEditorStore } from "@/store/editor.store";
import { Grid } from "@react-three/drei";

const SceneGrid = () => {
  const snapGrid = useEditorStore((s) => s.snapGrid);

  return (
    <Grid
      position={[0, 0, 0]}
      args={[20, 20]}
      cellSize={snapGrid}
      cellThickness={0.5}
      cellColor="#6b7280"
      sectionSize={5}
      sectionThickness={1}
      sectionColor="#374151"
      fadeDistance={30}
      fadeStrength={1}
      followCamera
      infiniteGrid
      side={1}
    />
  );
};

export default SceneGrid;
