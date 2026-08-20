import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Right-hand overlay panel. Used for per-ticker history so the card grid keeps
 * a uniform row height -- expanding inline leaves a dead column beside shorter
 * cards. Traps focus, closes on Escape or backdrop click, and restores focus to
 * whatever opened it.
 */
export function Drawer({ open, onClose, title, subtitle, children }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreFocusTo = useRef<HTMLElement | null>(null)
  const titleId = useId()

  // Remember the trigger before the overlay steals focus.
  useEffect(() => {
    if (open) restoreFocusTo.current = document.activeElement as HTMLElement | null
  }, [open])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return

      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        return
      }

      if (e.key !== 'Tab') return

      const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (!nodes || nodes.length === 0) return

      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      const active = document.activeElement

      // Wrap at both ends so focus can never escape the panel.
      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    },
    [open, onClose],
  )

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Move focus into the panel once it exists.
    const raf = requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus()
    })

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = prevOverflow
      cancelAnimationFrame(raf)
      restoreFocusTo.current?.focus?.()
    }
  }, [open, handleKeyDown])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ x: 24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 24, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute inset-y-0 right-0 flex w-full max-w-[420px] flex-col border-l border-border bg-surface"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <h2 id={titleId} className="text-[14px] font-semibold text-text">
                  {title}
                </h2>
                {subtitle && <p className="mt-0.5 text-[11px] text-dim">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                aria-label="Close panel"
                className="-mr-1 rounded p-1 text-dim transition-colors duration-150 ease-out hover:text-text"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
