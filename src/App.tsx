import { useEffect } from "react";
import Canvas from "./components/canvas";
import Layout from "./renderer/layout";
import AuthScreen from "./renderer/auth/AuthScreen";
import AdminPage from "./renderer/admin/AdminPage";
import { useAuthStore } from "./store/auth.store";
import { useRouterStore } from "./store/router.store";
import { isAdminRole } from "./api/authApi";
import { BrandMark } from "./components/BrandMark";
import { APP_NAME, APP_TAGLINE } from "./lib/brand";
// import SplashScreen from "./components/SplashScreen";

const Splash = () => (
  <div className="flex h-svh w-svw flex-col items-center justify-center bg-canvas canvasgrid">
    <div className="grid size-16 place-items-center rounded-xl bg-brand text-brand-foreground shadow-pop">
      <BrandMark className="size-9" />
    </div>
    <div className="mt-5 text-xl font-semibold tracking-tight">{APP_NAME}</div>
    <div className="mt-1 text-sm text-ink-3 mono">{APP_TAGLINE}</div>
    <div className="mt-7 h-1 w-48 overflow-hidden rounded-full bg-panel-3">
      <div className="h-full w-2/3 rounded-full bg-brand barpulse" />
    </div>
  </div>
);

const App = () => {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const initialize = useAuthStore((s) => s.initialize);
  const route = useRouterStore((s) => s.route);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  // App is ready once the auth boot check resolves (authed or anon) — slide the
  // init splash out. The splash also self-dismisses via a safety timeout.
  useEffect(() => {
    if (status !== "loading") window.__hideSplash?.();
  }, [status]);

  if (status === "loading") return <Splash />;
  if (status !== "authed") return <AuthScreen />;

  // Admin route is role-gated; anyone else falls through to the editor.
  if (route === "admin" && user && isAdminRole(user.role)) return <AdminPage />;

  return (
    <div className="w-svw h-svh relative">
      {/* <SplashScreen /> */}

      <Layout />
      <Canvas />
    </div>
  );
};

export default App;
