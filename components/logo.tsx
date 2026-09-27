/**
 * Edvance logo.
 *
 * The mark is an "E" built from three stacked source bars inside a seal —
 * the middle bar is highlighted rust, because Edvance highlights the evidence
 * that matters and flags the source that disagrees.
 *
 * `idSuffix` keeps the gradient ids unique per instance so the same mark can
 * render many times on a page (header, footer, auth panel) without collisions.
 */

type LogoMarkProps = {
  size?: number;
  idSuffix?: string;
  className?: string;
  title?: string;
};

export function LogoMark({
  size = 40,
  idSuffix = "default",
  className = "logo-mark",
  title,
}: LogoMarkProps) {
  const seal = `edvance-seal-${idSuffix}`;
  const gloss = `edvance-gloss-${idSuffix}`;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={seal} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2C6E70" />
          <stop offset="58%" stopColor="#1A4245" />
          <stop offset="100%" stopColor="#0D2327" />
        </linearGradient>
        <linearGradient id={gloss} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="40" height="40" rx="12" fill={`url(#${seal})`} />
      <rect
        x="1.25"
        y="1.25"
        width="37.5"
        height="37.5"
        rx="11"
        fill="none"
        stroke="#FBF6EA"
        strokeOpacity="0.16"
      />
      <rect width="40" height="16" rx="12" fill={`url(#${gloss})`} />

      {/* Three source bars: top, highlighted middle, bottom */}
      <rect x="11.5" y="11.6" width="17" height="3.7" rx="1.85" fill="#FBF6EA" />
      <rect x="11.5" y="18.15" width="12.6" height="3.7" rx="1.85" fill="#DC6338" />
      <rect x="11.5" y="24.7" width="8.6" height="3.7" rx="1.85" fill="#FBF6EA" />
    </svg>
  );
}

type LogoProps = {
  /** Show the small rust descriptor under the wordmark. */
  tag?: string | null;
  size?: number;
  idSuffix?: string;
  className?: string;
};

export function Logo({
  tag = "Course Intelligence",
  size = 40,
  idSuffix = "default",
  className = "logo-lockup",
}: LogoProps) {
  return (
    <span className={className}>
      <LogoMark size={size} idSuffix={idSuffix} />
      <span className="logo-type">
        <span className="logo-word">Edvance</span>
        {tag ? <span className="logo-tag">{tag}</span> : null}
      </span>
    </span>
  );
}
