import GlobalCursor from "./sidebar/GlobalCursor";
import WallActions from "./WallActions";
import Header from "./header";
import SubPageBar from "./header/SubPageBar";
import MobileToolbar from "./MobileToolbar";
import { usePricingSync } from "@/api/usePricingSync";

const Layout = () => {
  // Keep per-user pricing settings synced with the backend (authed-only mount).
  usePricingSync();

  return (
    <>
      <GlobalCursor />

      <Header />
      <SubPageBar />

      <WallActions />

      <MobileToolbar />
    </>
  );
};

export default Layout;
