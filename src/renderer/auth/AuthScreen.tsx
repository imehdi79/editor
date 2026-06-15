/**
 * AuthScreen — full-screen login / register gate.
 *
 * Mobile-first centered card. Toggles between Login and Register, surfaces the
 * backend's error message (and validation issues), and disables while a request
 * is in flight. On success the auth store flips to "authed" and the app reveals
 * the editor.
 */

import { useState } from "react";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth.store";

type Mode = "login" | "register";

const AuthScreen = () => {
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const busy = useAuthStore((s) => s.busy);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isRegister = mode === "register";
  const passwordTooShort = password.length > 0 && password.length < 8;
  const canSubmit = email.trim().length > 0 && password.length >= 8 && !busy;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const fn = isRegister ? register : login;
    await fn(email.trim(), password);
  };

  const switchMode = () => {
    clearError();
    setMode((m) => (m === "login" ? "register" : "login"));
  };

  return (
    <div className="flex h-svh w-svw items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-popover p-6 shadow-2xl">
        <div className="mb-5 text-center">
          <h1 className="text-lg font-semibold">Construct Editor</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {isRegister ? "Create an account to save your projects." : "Sign in to your projects."}
          </p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Email</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:border-ring"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Password</span>
            <input
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              required
              minLength={8}
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:border-ring"
            />
            <span className={passwordTooShort ? "text-destructive" : "text-muted-foreground"}>
              8–72 characters
            </span>
          </label>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" disabled={!canSubmit} className="mt-1 w-full">
            {busy ? (
              <Loader2 size={15} className="animate-spin" />
            ) : isRegister ? (
              <UserPlus size={15} />
            ) : (
              <LogIn size={15} />
            )}
            {isRegister ? "Create account" : "Sign in"}
          </Button>
        </form>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          {isRegister ? "Already have an account?" : "No account yet?"}{" "}
          <button type="button" onClick={switchMode} className="font-medium text-primary hover:underline">
            {isRegister ? "Sign in" : "Create one"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
