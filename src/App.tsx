import Canvas from "./components/canvas"
import Layout from "./renderer/layout"

const App = () => {
  return (
    <div className="w-svw h-svh relative">
      <Layout />
      <Canvas />
    </div>
  )
}

export default App
