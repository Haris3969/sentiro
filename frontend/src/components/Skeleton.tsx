export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-surface-2 ${className}`} />
}

export function TickerCardSkeleton() {
  return (
    <div className="glass rounded-2xl border border-border p-5">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-3 w-10" />
          </div>
        </div>
        <div className="space-y-1.5 text-right">
          <Skeleton className="ml-auto h-4 w-14" />
          <Skeleton className="ml-auto h-3 w-10" />
        </div>
      </div>

      <Skeleton className="mb-4 h-40 w-full" />
      <Skeleton className="mb-3 h-6 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  )
}
