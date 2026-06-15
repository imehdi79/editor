/**
 * AccountMenu — header dropdown showing the signed-in user + logout.
 */

import { useState, useRef, useEffect } from "react";
import { User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth.store";

const AccountMenu = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <Button
        size="icon-sm"
        variant={open ? "default" : "ghost"}
        title={user?.email ?? "Account"}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        <User size={15} />
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border bg-popover p-1.5 shadow-2xl">
          <div className="px-2 py-1.5">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Signed in as</div>
            <div className="truncate text-xs font-medium" title={user?.email}>
              {user?.email}
            </div>
          </div>
          <div className="my-1 border-t" />
          <Button
            size="sm"
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive"
            onClick={() => {
              setOpen(false);
              logout();
            }}
          >
            <LogOut size={15} /> Log out
          </Button>
        </div>
      )}
    </div>
  );
};

export default AccountMenu;
