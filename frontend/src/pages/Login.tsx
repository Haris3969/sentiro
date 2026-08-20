import { TrendingUp } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { LoginBolts } from '../components/LoginBolts'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

export function Login() {
  const { session, loading } = useAuth()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && session) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setInfo(null)

    const { error } =
      mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
    } else if (mode === 'sign-up') {
      setInfo('Account created. Check your email to confirm, then sign in.')
    }
    setSubmitting(false)
  }

  const field =
    'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-[13px] text-text placeholder:text-dim transition-colors duration-150 ease-out focus:border-border-strong focus:outline-none'

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg px-4">
      <LoginBolts />

      <div className="relative w-full max-w-[340px]">
        <div className="mb-7 flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-bg">
            <TrendingUp size={15} />
          </div>
          <span className="text-[14px] font-semibold tracking-tight text-text">Sentiro</span>
        </div>

        <h1 className="text-[20px] font-semibold tracking-tight text-text">
          {mode === 'sign-in' ? 'Sign in' : 'Create account'}
        </h1>
        <p className="mb-6 mt-1 text-[13px] text-muted">
          {mode === 'sign-in'
            ? 'Market sentiment for your watchlist.'
            : 'Start tracking sentiment across your watchlist.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className={field}
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className={field}
          />
          {error && <p className="text-[12px] text-bear">{error}</p>}
          {info && <p className="text-[12px] text-bull">{info}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-accent px-4 py-2.5 text-[13px] font-medium text-bg transition-opacity duration-150 ease-out disabled:opacity-40"
          >
            {submitting ? 'Please wait' : mode === 'sign-in' ? 'Sign in' : 'Sign up'}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')
            setError(null)
            setInfo(null)
          }}
          className="mt-4 text-[12px] text-dim transition-colors duration-150 ease-out hover:text-text"
        >
          {mode === 'sign-in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  )
}
