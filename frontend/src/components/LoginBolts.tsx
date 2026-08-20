import { useId } from 'react'

// lucide's `zap` outline, so the decoration matches the icon set used everywhere
// else rather than introducing a second visual vocabulary.
const ZAP =
  'M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z'

function Bolt({ className, delay = 0 }: { className?: string; delay?: number }) {
  // Gradient/filter ids must be unique per instance or the second bolt reuses
  // the first one's defs.
  const uid = useId().replace(/:/g, '')

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id={`fill-${uid}`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.20" />
          <stop offset="55%" stopColor="var(--color-accent)" stopOpacity="0.06" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </linearGradient>
        <filter id={`glow-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>

      {/* Blurred copy underneath does the glowing; the crisp copy sits on top so
          the silhouette stays readable instead of turning into a smudge.
          Everything here is deliberately near-threshold -- this is a watermark
          you notice on second glance, not the subject of the page. */}
      <path
        d={ZAP}
        fill="var(--color-accent)"
        opacity={0.18}
        filter={`url(#glow-${uid})`}
        style={{ animation: 'bolt-pulse 7s ease-in-out infinite', animationDelay: `${delay}s` }}
      />
      <path d={ZAP} fill={`url(#fill-${uid})`} />
      <path
        d={ZAP}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={0.09}
        strokeOpacity={0.30}
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Ambient accent for the sign-in screen only.
 *
 * Deliberately not used on the dashboard: there the accent is reserved for
 * interactive elements so it never competes with sentiment colour. An auth
 * screen has no data to compete with, so it can carry brand.
 */
export function LoginBolts() {
  return (
    // z-0 rather than -z-10: the parent paints an opaque bg-bg, so a negative
    // z-index would stack the bolts behind it and render nothing at all.
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 hidden overflow-hidden md:block"
    >
      {/* Soft pools of light so the bolts sit in something rather than floating. */}
      <div
        className="absolute -left-40 top-1/2 h-[32rem] w-[32rem] -translate-y-1/2 rounded-full opacity-[0.09]"
        style={{
          background: 'radial-gradient(circle, var(--color-accent), transparent 70%)',
          filter: 'blur(48px)',
        }}
      />
      <div
        className="absolute -right-40 top-1/2 h-[32rem] w-[32rem] -translate-y-1/2 rounded-full opacity-[0.09]"
        style={{
          background: 'radial-gradient(circle, var(--color-accent), transparent 70%)',
          filter: 'blur(48px)',
        }}
      />

      {/* Kept cropped by the viewport edge at every breakpoint -- a bolt that
          sits fully in frame reads as clip-art parked in the margin, whereas a
          partial one reads as editorial framing. */}
      <Bolt className="absolute -left-28 top-1/2 h-[26rem] -translate-y-1/2 -rotate-[14deg] xl:-left-20 2xl:-left-12" />
      <Bolt
        delay={-3.5}
        className="absolute -right-28 top-1/2 h-[26rem] -translate-y-1/2 rotate-[14deg] scale-x-[-1] xl:-right-20 2xl:-right-12"
      />
    </div>
  )
}
