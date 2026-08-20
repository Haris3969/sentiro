import type { Session } from '@supabase/supabase-js'
import { createContext } from 'react'

export interface AuthContextValue {
  session: Session | null
  loading: boolean
}

/**
 * Kept in its own module so the provider file exports only a component and the
 * hook file exports only a hook -- a file mixing the two breaks Fast Refresh
 * (react-refresh/only-export-components).
 */
export const AuthContext = createContext<AuthContextValue>({ session: null, loading: true })
