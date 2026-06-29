/**
 * Header — mobile-first top bar: Projects drawer (which holds the project name,
 * Save, and the workspace hub) and the page switcher.
 *
 * Sits as fixed app chrome above the canvas; the floating sidebar is offset
 * below it. Document state lives in projects.store / floor-plan.store.
 */

import ProjectsDrawer from "./ProjectsDrawer";
import PageTabs from "./PageTabs";
import { BrandMark } from "@/components/BrandMark";
import { APP_NAME } from "@/lib/brand";

const Header = () => {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-12 items-center gap-2 border-b bg-popover/95 px-2 backdrop-blur-sm">
      <div className="flex shrink-0 items-center gap-1.5">
        <div className="grid size-5.5 place-items-center rounded bg-brand text-brand-foreground">
          <BrandMark className="size-3.5" />
        </div>
        <span className="hidden text-sm font-semibold tracking-tight sm:inline">{APP_NAME}</span>
      </div>
      <div className="h-5 w-px shrink-0 bg-border" />
      <ProjectsDrawer />
      <div className="h-5 w-px shrink-0 bg-border" />
      <PageTabs />
    </header>
  );
};

export default Header;
