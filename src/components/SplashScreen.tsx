import { useEffect, useRef, useState } from "react";

/** Keep the splash up at least this long so it doesn't flash by when the auth
 *  boot check resolves near-instantly. */
const MIN_DISPLAY_MS = 1000;
/** Hard ceiling so the splash can never trap the app behind it if the auth
 *  boot check hangs or `__hideSplash` is never called. */
const SAFETY_TIMEOUT_MS = 8000;
/** Must match the fade-out transition duration below. */
const EXIT_DURATION_MS = 400;

const SplashScreen = () => {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const mountedAt = Date.now();
    // Defer the fade-out until the minimum display time has elapsed.
    const dismiss = () => {
      const remaining = MIN_DISPLAY_MS - (Date.now() - mountedAt);
      if (remaining > 0) setTimeout(() => setExiting(true), remaining);
      else setExiting(true);
    };

    // App.tsx calls this once the auth boot check resolves.
    window.__hideSplash = dismiss;
    // Safety net: never leave the splash up forever.
    const safety = setTimeout(dismiss, SAFETY_TIMEOUT_MS);

    return () => {
      clearTimeout(safety);
      clearTimeout(exitTimer.current);
      if (window.__hideSplash === dismiss) window.__hideSplash = undefined;
    };
  }, []);

  // Once we begin exiting, unmount after the fade-out finishes.
  useEffect(() => {
    if (!exiting) return;
    exitTimer.current = setTimeout(() => setVisible(false), EXIT_DURATION_MS);
    return () => clearTimeout(exitTimer.current);
  }, [exiting]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-9999 flex items-center justify-center overflow-hidden bg-[#2c2c2c] transition-opacity duration-400 ease-out ${
        exiting ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="animate-[splash-in_600ms_ease-out] rounded-full border border-white/15 p-[clamp(0.5rem,1.5vmin,1rem)]">
        <img
          src="/MEHDIFY.jpg"
          alt="Splash"
          className="aspect-square w-[clamp(7rem,32vmin,16rem)] rounded-full object-cover"
        />
      </div>
      <style>{`
        @keyframes splash-in {
          0%   { opacity: 0; transform: scale(0.85); }
          60%  { opacity: 1; }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
