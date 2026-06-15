/**
 * Header — mobile-first top bar: Projects drawer (which holds the project name,
 * Save, and the workspace hub) and the page switcher.
 *
 * Sits as fixed app chrome above the canvas; the floating sidebar is offset
 * below it. Document state lives in projects.store / floor-plan.store.
 */

import ProjectsDrawer from "./ProjectsDrawer";
import PageTabs from "./PageTabs";

const Header = () => {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-12 items-center gap-2 border-b bg-popover/95 px-2 backdrop-blur-sm">
      <ProjectsDrawer />
      <div className="h-5 w-px shrink-0 bg-border" />
      <PageTabs />
    </header>
  );
};

export default Header;
