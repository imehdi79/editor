import { useEffect } from "react"
import { Loader2 } from "lucide-react"
import Canvas from "./components/canvas"
import Layout from "./renderer/layout"
import AuthScreen from "./renderer/auth/AuthScreen"
import { useAuthStore } from "./store/auth.store"
import SplashScreen from "./components/SplashScreen"

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

  // App is ready once the auth boot check resolves (authed or anon) — slide the
  // init splash out. The splash also self-dismisses via a safety timeout.
  useEffect(() => {
    if (status !== "loading") window.__hideSplash?.()
  }, [status])

  if (status === "loading") return <Splash />
  if (status !== "authed") return <AuthScreen />

  return (
    <div className="w-svw h-svh relative">
      <SplashScreen />

      <Layout />
      <Canvas />
    </div>
  )
}

export default App
