/**
 * Naseej Textile Recovery Platform — provisional brand lockup (inline SVG, no asset files).
 *
 * A weave mark (interlaced warp and weft strokes) over a bilingual wordmark.
 * Variants:
 *   - `dark` (default): indigo ink for light backgrounds
 *   - `light`: warm-white for dark backgrounds (sidebar, sign-in panel)
 *   - markOnly: the weave mark alone (collapsed sidebar, favicons)
 *
 * NOTE: provisional white-label identity. Replace with the official brand
 * files (vector + usage guide) when an operating brand is adopted.
 */

interface LogoProps {
  variant?: 'dark' | 'light';
  /** Width in pixels (height auto-derived from the source aspect ratio) */
  width?: number;
  alt?: string;
  className?: string;
  /** Show only the weave mark (no wordmark). */
  markOnly?: boolean;
  priority?: boolean;
}

const LOCKUP_ASPECT = 640 / 144; // matches the lockup viewBox below
const MARK_ASPECT = 168 / 144;

/** Weave mark — three warp strokes over three weft strokes, interlaced. */
function WeaveMark({ ink, accent }: { ink: string; accent: string }) {
  return (
    <g strokeLinecap="round" fill="none">
      {/* warp (vertical) */}
      <g stroke={ink} strokeWidth="10">
        <path d="M54 22 V 122" />
        <path d="M84 22 V 122" />
        <path d="M114 22 V 122" />
      </g>
      {/* weft (horizontal) in the accent, drawn in segments so it reads as woven */}
      <g stroke={accent} strokeWidth="10">
        <path d="M30 48 H 46" /><path d="M62 48 H 76" /><path d="M92 48 H 106" /><path d="M122 48 H 138" />
        <path d="M30 76 H 138" />
        <path d="M30 104 H 46" /><path d="M62 104 H 76" /><path d="M92 104 H 106" /><path d="M122 104 H 138" />
      </g>
      {/* over-strokes: warp crossing the middle weft */}
      <g stroke={ink} strokeWidth="10">
        <path d="M54 66 V 86" /><path d="M114 66 V 86" />
      </g>
    </g>
  );
}

export default function Logo({
  variant = 'dark',
  width = 160,
  alt = 'Naseej Textile Recovery Platform — منصة نسيج لاستعادة المنسوجات',
  className,
  markOnly = false,
  priority: _priority = false,
}: LogoProps) {
  const ink = variant === 'light' ? '#F5F2EC' : '#1F2A44';
  const accent = variant === 'light' ? '#A596FF' : '#6B4EFF';
  const sub = variant === 'light' ? 'rgba(245,242,236,0.75)' : '#6B7280';

  const aspectRatio = markOnly ? MARK_ASPECT : LOCKUP_ASPECT;
  const height = Math.round(width / aspectRatio);

  if (markOnly) {
    return (
      <svg
        viewBox="0 0 168 144"
        width={width}
        height={height}
        className={className}
        role="img"
        aria-label={alt}
      >
        <WeaveMark ink={ink} accent={accent} />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 640 144"
      width={width}
      height={height}
      className={className}
      role="img"
      aria-label={alt}
    >
      <WeaveMark ink={ink} accent={accent} />
      {/* Wordmark */}
      <text
        x="168"
        y="66"
        fill={ink}
        fontFamily="Inter, 'Segoe UI', sans-serif"
        fontSize="22"
        fontWeight="700"
        letterSpacing="0.5"
      >
        NASEEJ TEXTILE RECOVERY PLATFORM
      </text>
      <text
        x="168"
        y="108"
        fill={sub}
        fontFamily="'Noto Naskh Arabic', 'Segoe UI', sans-serif"
        fontSize="26"
      >
        منصة نسيج لاستعادة المنسوجات
      </text>
    </svg>
  );
}
