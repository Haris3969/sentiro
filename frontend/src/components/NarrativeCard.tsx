import { Sparkles } from 'lucide-react'

interface NarrativeCardProps {
  narrative: string
  generatedAt: string
}

export function NarrativeCard({ narrative, generatedAt }: NarrativeCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-surface-2/60 p-4">
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20"
        style={{ background: 'radial-gradient(circle, var(--color-accent), transparent 70%)' }}
      />
      <div className="mb-2 flex items-center gap-1.5 text-accent">
        <Sparkles size={14} />
        <span className="text-xs font-medium uppercase tracking-wide">AI narrative</span>
      </div>
      <p className="text-sm leading-relaxed text-text">{narrative}</p>
      <p className="mt-3 text-xs text-muted">
        Generated {new Date(generatedAt).toLocaleString()}
      </p>
    </div>
  )
}
