import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import Canvas from "./components/canvas"
import Layout from "./renderer/layout"
import AuthScreen from "./renderer/auth/AuthScreen"
import { useAuthStore } from "./store/auth.store"

const Splash = () => (
  <div className="flex h-svh w-svw items-center justify-center bg-muted/40">
    <Loader2 className="size-6 animate-spin text-muted-foreground" />
  </div>
)

const App = () => {
  const status = useAuthStore((s) => s.status)
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    void initialize()
  }, [initialize])

  if (status === "loading") return <Splash />
  if (status !== "authed") return <AuthScreen />

  return (
    <div className="w-svw h-svh relative">
      <Layout />
      <Canvas />
    </div>
  )
}

export default App
