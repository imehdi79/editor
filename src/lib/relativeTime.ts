/**
 * formatRelativeTime — compact "time ago" for recents lists.
 * Falls back to a short date once past a week.
 */
export const formatRelativeTime = (epochMs: number, now: number = Date.now()): string => {
  const diff = now - epochMs;
  if (diff < 0) return "just now";

  const sec = Math.floor(diff / 1000);
  if (sec < 45) return "just now";

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;

  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;

  return new Date(epochMs).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};
