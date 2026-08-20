import { TrendingUp } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { GitHubMark, GoogleMark } from '../components/BrandMarks'
import { LoginBolts } from '../components/LoginBolts'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'

type OAuthProvider = 'google' | 'github'

/**
 * A failed OAuth round-trip comes back to this page with the reason in either
 * the query string or the hash, depending on the flow type. Read once at mount
 * so a provider that is disabled or misconfigured says so instead of silently
 * bouncing the user back to a blank form.
 */
function readOAuthError(): string | null {
  if (typeof window === 'undefined') return null
  const query = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const raw =
    query.get('error_description') ??
    hash.get('error_description') ??
    query.get('error') ??
    hash.get('error')
  return raw ? decodeURIComponent(raw.replace(/\+/g, ' ')) : null
}

export function Login() {
  const { session, loading } = useAuth()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // Seeded from the URL rather than set in an effect, so there is no
  // second render and no setState-inside-effect.
  const [error, setError] = useState<string | null>(readOAuthError)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [oauthPending, setOauthPending] = useState<OAuthProvider | null>(null)

  // Strip the error params so a refresh does not resurrect a stale message.
  useEffect(() => {
    if (window.location.search || window.location.hash) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  if (!loading && session) {
    return <Navigate to="/" replace />
  }

  async function handleOAuth(provider: OAuthProvider) {
    setOauthPending(provider)
    setError(null)
    setInfo(null)

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      // origin, not a hardcoded URL, so this works on localhost and preview
      // deploys as well as production.
      options: { redirectTo: `${window.location.origin}/` },
    })

    // On success the browser is already navigating to the provider, so this
    // only runs when the handshake could not even be started.
    if (error) {
      setError(error.message)
      setOauthPending(null)
    }
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

        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { id: 'google', label: 'Google', Mark: GoogleMark },
              { id: 'github', label: 'GitHub', Mark: GitHubMark },
            ] as const
          ).map(({ id, label, Mark }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleOAuth(id)}
              disabled={oauthPending !== null || submitting}
              className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 text-[13px] text-text transition-colors duration-150 ease-out hover:border-border-strong disabled:opacity-40"
            >
              <Mark className="h-4 w-4 shrink-0" />
              {oauthPending === id ? 'Redirecting' : label}
            </button>
          ))}
        </div>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[11px] text-dim">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

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
            disabled={submitting || oauthPending !== null}
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
