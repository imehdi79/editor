import { Canvas as FiberCanvas } from "@react-three/fiber";
import Scene from "./Scene";

const C3D = () => {
  return (
    <div className="relative flex h-full w-full">
      <div id="canvas-container" className="flex-1 w-full h-full">
        <FiberCanvas camera={{ position: [0, 5, -10], fov: 60 }} shadows gl={{ antialias: true }} shadow-radius={4}>
          <Scene />
        </FiberCanvas>
      </div>
    </div>
  );
};

export default C3D;
