const SceneLights = () => {
  return (
    <>
      <ambientLight intensity={0.45} />

      <directionalLight
        castShadow
        position={[10, 12, 10]}
        intensity={1.1}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-bias={-0.0001}
      />

      <directionalLight position={[-5, 6, -5]} intensity={0.2} />
    </>
  );
};

export default SceneLights;
