/**
 * AuthScreen — the login / register gate.
 *
 * Split CAD layout: a brand panel with a plan motif (md+) beside the form. The
 * form toggles Sign in / Register, surfaces the backend's error message, and
 * disables while a request is in flight. On success the auth store flips to
 * "authed" and the editor is revealed. Logic (email + password ≥ 8) is unchanged.
 */

import { useState } from "react";
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/BrandMark";
import { useAuthStore } from "@/store/auth.store";
import { useTranslation } from "@/i18n";

type Mode = "login" | "register";

const AuthScreen = () => {
  const { t } = useTranslation();
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const busy = useAuthStore((s) => s.busy);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isRegister = mode === "register";
  const passwordTooShort = password.length > 0 && password.length < 8;
  const canSubmit = email.trim().length > 0 && password.length >= 8 && !busy;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const fn = isRegister ? register : login;
    await fn(email.trim(), password);
  };

  const pickMode = (next: Mode) => {
    if (next === mode) return;
    clearError();
    setMode(next);
  };

  return (
    <div className="flex h-svh w-svw bg-bg">
      {/* Brand panel — hidden on small screens */}
      <div className="relative hidden flex-col justify-between bg-canvas p-10 canvasgrid hair md:flex md:basis-[46%]">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-brand text-brand-foreground">
            <BrandMark className="size-5" />
          </div>
          <span className="text-base font-semibold tracking-tight">{t("auth.appName")}</span>
        </div>

        <div>
          <svg viewBox="0 0 320 200" className="w-full max-w-sm" fill="none" stroke="var(--ink-3)" strokeWidth={1.2}>
            <rect x="40" y="50" width="160" height="110" stroke="var(--ink-2)" />
            <rect x="200" y="50" width="80" height="110" stroke="var(--ink-2)" />
            <path d="M120 50 V160" stroke="var(--brand)" />
            <g stroke="var(--brand)" fontSize="8" fill="var(--brand)">
              <line x1="40" y1="36" x2="200" y2="36" />
              <text x="112" y="32" className="mono">4200</text>
            </g>
            <path d="M120 130 A30 30 0 0 1 150 160" strokeDasharray="2 3" />
          </svg>
          <h1 className="mt-8 text-2xl font-semibold leading-tight tracking-tight">{t("auth.tagline")}</h1>
          <p className="mt-2 max-w-sm text-ink-2">{t("auth.taglineSub")}</p>
        </div>

        <div className="text-2xs text-ink-3 mono">© 2026 {t("auth.appName")} · EN · IT · DE · FA</div>
      </div>

      {/* Form panel */}
      <div className="grid flex-1 place-items-center overflow-y-auto p-6">
        <div className="w-full max-w-85 fadeup">
          {/* Brand (mobile only — the side panel is hidden) */}
          <div className="mb-6 flex items-center gap-2.5 md:hidden">
            <div className="grid size-8 place-items-center rounded-lg bg-brand text-brand-foreground">
              <BrandMark className="size-5" />
            </div>
            <span className="text-base font-semibold tracking-tight">{t("auth.appName")}</span>
          </div>

          {/* Tabs */}
          <div className="mb-6 flex rounded-md bg-panel-2 p-1 hair">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => pickMode(m)}
                className={cn(
                  "h-9 flex-1 rounded text-sm font-semibold transition-colors",
                  mode === m ? "bg-panel text-ink hair" : "text-ink-2 hover:text-ink",
                )}
              >
                {m === "login" ? t("auth.signIn") : t("auth.register")}
              </button>
            ))}
          </div>

          <h2 className="text-lg font-semibold tracking-tight">
            {isRegister ? t("auth.createAccount") : t("auth.welcomeBack")}
          </h2>
          <p className="mt-1 text-sm text-ink-3">
            {isRegister ? t("auth.registerSubtitle") : t("auth.signInSubtitle")}
          </p>

          <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-2xs uppercase tracking-wider text-ink-3 mono">{t("auth.email")}</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 rounded-md bg-panel px-3 text-base outline-none hair focus:ring-1 focus:ring-brand"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-2xs uppercase tracking-wider text-ink-3 mono">{t("auth.password")}</span>
              <div className="flex h-10 items-center rounded-md bg-panel pe-1 hair focus-within:ring-1 focus-within:ring-brand">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  required
                  minLength={8}
                  maxLength={72}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 bg-transparent px-3 text-base outline-none"
                />
                <button
                  type="button"
                  title={t("auth.togglePassword")}
                  aria-label={t("auth.togglePassword")}
                  onClick={() => setShowPassword((v) => !v)}
                  className="grid size-8 place-items-center text-ink-3 hover:text-ink"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <span className={cn("text-xs", passwordTooShort ? "text-danger" : "text-ink-3")}>
                {t("auth.passwordHint")}
              </span>
            </label>

            {error && (
              <div className="flex items-center gap-2 rounded-md bg-danger/10 px-3 py-2 text-xs text-danger hair">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" disabled={!canSubmit} className="mt-1 h-10 w-full">
              {busy && <Loader2 size={15} className="animate-spin" />}
              {isRegister ? t("auth.createAccount") : t("auth.signIn")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
