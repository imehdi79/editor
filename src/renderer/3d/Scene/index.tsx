import SceneGrid from './SceneGrid'
import SceneLights from './SceneLights'
import SceneWalls from './SceneWalls'

const Scene = () => {
  return (
    <>
      <SceneLights />

      <SceneGrid />

      <SceneWalls />
    </>
  )
}

export default Scene
