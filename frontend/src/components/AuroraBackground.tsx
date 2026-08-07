export function AuroraBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-bg">
      <div className="bg-grid absolute inset-0" />
      <div
        className="aurora-blob absolute -left-40 -top-40 h-[40rem] w-[40rem] rounded-full opacity-70"
        style={{ background: 'radial-gradient(circle, var(--color-accent), transparent 65%)' }}
      />
      <div
        className="aurora-blob absolute -right-32 top-1/4 h-[34rem] w-[34rem] rounded-full opacity-60"
        style={{
          background: 'radial-gradient(circle, var(--color-accent-2), transparent 65%)',
          animationDelay: '-6s',
        }}
      />
      <div
        className="aurora-blob absolute bottom-[-10rem] left-1/4 h-[32rem] w-[32rem] rounded-full opacity-50"
        style={{
          background: 'radial-gradient(circle, var(--color-bull), transparent 65%)',
          animationDelay: '-11s',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-bg/20 to-bg" />
    </div>
  )
}
