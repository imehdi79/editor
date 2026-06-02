import { Layer, Rect, Stage } from "react-konva";

const C2D = () => {
  return (
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>
        <Rect x={20} y={50} width={100} height={100} fill="red" shadowBlur={10}  />
      </Layer>
    </Stage>
  );
};

export default C2D;
