import { useState, useEffect, useRef } from 'react'
import { LogIn, Lock, Mail, Globe } from 'lucide-react'

/** Response passed to the Google Identity Services `callback` — see
 * https://developers.google.com/identity/gsi/web/reference/js-reference#CredentialResponse */
interface GoogleCredentialResponse {
  credential: string
  select_by?: string
}

/** Config accepted by `google.accounts.id.initialize()` — only the fields
 * this file actually passes (Google's real type has many more optional
 * fields; see https://developers.google.com/identity/gsi/web/reference/js-reference#IdConfiguration). */
interface GoogleIdConfiguration {
  client_id: string
  callback: (response: GoogleCredentialResponse) => void
}

/** Options accepted by `google.accounts.id.renderButton()` — see
 * https://developers.google.com/identity/gsi/web/reference/js-reference#GsiButtonConfiguration */
interface GoogleButtonOptions {
  // Typed as a plain string, not the documented 'outline'|'filled_blue'|
  // 'filled_black' union: this file actually passes theme: 'dark' below,
  // which isn't one of Google's documented values (found while typing —
  // not fixed, since swapping it changes the rendered button's look; left
  // as-is and noted in ROADMAP_HONEST.md).
  theme?: string
  size?: 'large' | 'medium' | 'small'
  width?: string | number
  type?: 'standard' | 'icon'
  text?: string
  shape?: string
  logo_alignment?: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleIdConfiguration) => void
          renderButton: (element: Element, options: GoogleButtonOptions) => void
        }
      }
    }
  }
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRegister, setIsRegister] = useState(false)
  const [displayName, setDisplayName] = useState('')

  const onLoginSuccess = () => {
    window.location.href = '/'
  }

  const handleGoogleResponse = async (response: GoogleCredentialResponse) => {
    try {
      setError(null)
      setIsLoading(true)

      // Send Google token to backend for verification and user creation
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: response.credential,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Google authentication failed')
      }

      const data = await res.json()

      // Store tokens and user data
      localStorage.setItem('access_token', data.access_token)
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token)
      }
      localStorage.setItem('user', JSON.stringify(data.user))

      onLoginSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
    } finally {
      setIsLoading(false)
    }
  }

  // The script-load effect below runs once (mount only) and must still call
  // whatever the *latest* handleGoogleResponse is — it's a new function
  // object every render. A ref sidesteps both the react-hooks/exhaustive-deps
  // warning and the actual stale-closure risk without re-injecting the
  // Google script on every render.
  const handleGoogleResponseRef = useRef(handleGoogleResponse)
  useEffect(() => {
    handleGoogleResponseRef.current = handleGoogleResponse
  })

  useEffect(() => {
    // Load Google Sign-In script
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    document.body.appendChild(script)

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
          callback: (response: GoogleCredentialResponse) => handleGoogleResponseRef.current(response),
        })
      }
    }

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login'
      const payload = isRegister
        ? { email, password, display_name: displayName }
        : { email, password }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Authentication failed')
      }

      const data = await response.json()

      // Store tokens
      localStorage.setItem('access_token', data.access_token)
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token)
      }
      localStorage.setItem('user', JSON.stringify(data.user))

      // Redirect by reloading
      onLoginSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center pn-app px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg prism-bg mb-4">
            <LogIn size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold pn-text mb-2">PrismNote</h1>
          <p className="pn-faint text-sm">Data science notebook. Fast. Open source. Works locally.</p>
        </div>

        {/* Form Card */}
        <div className="rounded-lg border pn-bd pn-surface p-8">
          <h2 className="text-lg font-semibold pn-text mb-6">
            {isRegister ? 'Create Account' : 'Sign In'}
          </h2>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-900/20 border border-rose-700/50">
              <p className="text-sm text-rose-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Display Name (Register only) */}
            {isRegister && (
              <div>
                <label htmlFor="displayName" className="block text-sm pn-faint mb-2">
                  Display Name (optional)
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border pn-bd pn-text text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-colors"
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm pn-faint mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 pn-faint pointer-events-none" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border pn-bd pn-text text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm pn-faint mb-2">
                Password
                {isRegister && <span className="text-rose-400 text-xs ml-1">(min 12 characters)</span>}
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 pn-faint pointer-events-none" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isRegister ? 'SecurePassword123!' : 'Your password'}
                  required
                  minLength={isRegister ? 12 : 1}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border pn-bd pn-text text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 outline-none transition-colors"
                />
              </div>
              {isRegister && (
                <p className="text-xs pn-faint mt-1">
                  Must be at least 12 characters for security
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 rounded-lg prism-bg text-white font-medium text-sm transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  {isRegister ? 'Creating account...' : 'Signing in...'}
                </span>
              ) : (
                isRegister ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6 pt-6 border-t pn-bd/50">
            <div className="flex items-center justify-center mb-6">
              <span className="pn-faint text-xs">or continue with</span>
            </div>

            {/* Google Sign-In Button */}
            <div className="mb-6">
              <button
                onClick={() => {
                  if (window.google) {
                    window.google.accounts.id.renderButton(
                      document.getElementById('google-signin-button')!,
                      {
                        theme: 'dark',
                        size: 'large',
                        width: '100%',
                      }
                    )
                  }
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border pn-bd text-white font-medium text-sm transition-colors"
              >
                <Globe size={16} />
                Sign in with Google
              </button>
              <div id="google-signin-button" className="mt-2" />
            </div>
          </div>

          {/* Toggle Register/Login */}
          <div className="text-center">
            <p className="text-sm pn-faint">
              {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => {
                  setIsRegister(!isRegister)
                  setError(null)
                  setEmail('')
                  setPassword('')
                  setDisplayName('')
                }}
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                {isRegister ? 'Sign In' : 'Create Account'}
              </button>
            </p>
          </div>
        </div>

        {/* Demo Credentials (Dev only) */}
        <div className="mt-6 p-4 rounded-lg bg-blue-900/20 border border-blue-700/50">
          <p className="text-xs text-blue-300 mb-2 font-semibold">Demo Credentials (Dev)</p>
          <button
            onClick={() => {
              setEmail('demo@example.com')
              setPassword('DemoPassword123!')
              setIsRegister(false)
            }}
            className="text-xs text-blue-400 hover:text-blue-300 underline"
          >
            Fill demo email/password
          </button>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs pn-faint">
            Your data stays on your machine. All computations run locally.
          </p>
          <p className="text-xs pn-faint mt-2">
            <a href="https://github.com/Mullassery/prismnote" className="text-blue-400 hover:text-blue-300">
              Open Source on GitHub
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
