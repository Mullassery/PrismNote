import { useState } from 'react'
import { LogIn, Lock, Mail } from 'lucide-react'

export default function Login() {
  const onLoginSuccess = () => {
    // Trigger re-render in AppWrapper by reloading or by callback
    window.location.href = '/'
  }
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRegister, setIsRegister] = useState(false)
  const [displayName, setDisplayName] = useState('')

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

          {/* Toggle Register/Login */}
          <div className="mt-6 pt-6 border-t pn-bd/50">
            <p className="text-sm pn-faint text-center">
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
