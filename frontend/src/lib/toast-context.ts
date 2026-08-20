import { createContext } from 'react'

export type ToastVariant = 'success' | 'error'

export interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void
}

/**
 * Split out for the same reason as auth-context: the provider module must
 * export only a component, and the hook module only a hook.
 */
export const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })
