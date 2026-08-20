import { Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface NarrativeCardProps {
  narrative: string
  generatedAt: string
}

export function NarrativeCard({ narrative, generatedAt }: NarrativeCardProps) {
  const textRef = useRef<HTMLParagraphElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [overflows, setOverflows] = useState(false)

  useEffect(() => {
    const el = textRef.current
    if (el && !expanded) {
      setOverflows(el.scrollHeight > el.clientHeight + 1)
    }
  }, [narrative, expanded])

  return (
    <div className="flex gap-2">
      <Sparkles size={12} className="mt-[3px] shrink-0 text-dim" aria-hidden />
      <div className="min-w-0 flex-1">
        <p
          ref={textRef}
          className={`text-[13px] leading-[1.5] text-muted ${expanded ? '' : 'line-clamp-3'}`}
        >
          {narrative}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          {(overflows || expanded) && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-[11px] text-dim transition-colors duration-150 ease-out hover:text-text"
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
          <span className="text-[11px] text-dim">
            {new Date(generatedAt).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>
    </div>
  )
}
