export function Skeleton({
  className = '',
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return <div className={`animate-pulse rounded bg-white/[0.05] ${className}`} style={style} />
}

export function TickerCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-3.5 w-10" />
        </div>
        <div className="space-y-1.5 text-right">
          <Skeleton className="ml-auto h-5 w-16" />
          <Skeleton className="ml-auto h-3 w-10" />
        </div>
      </div>

      <Skeleton className="mt-3 h-14 w-full" />
      <Skeleton className="mt-3 h-1 w-full rounded-full" />

      <div className="mt-3 space-y-1.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-[92%]" />
        <Skeleton className="h-3 w-[60%]" />
      </div>
    </div>
  )
}
