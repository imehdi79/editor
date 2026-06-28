/**
 * BrandMark — the Mehdify glyph (an abstract plan/datum mark). Stroke follows
 * `currentColor`; size via className. Reused across splash, auth and the header.
 */
export const BrandMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
    <path d="M4 20V4h6" />
    <path d="M4 20h16" />
    <path d="M9 20v-7h7v7" />
  </svg>
);

export default BrandMark;
