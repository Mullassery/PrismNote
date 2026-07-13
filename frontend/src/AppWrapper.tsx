import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import App from './App'

/**
 * Wrapper component that handles authentication
 * Shows homepage for everyone, but full app only for authenticated users
 * Unauthenticated users see homepage + can click to login
 */
export default function AppWrapper() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pn-app">
        <div className="text-center">
          <div className="inline-flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
          <p className="mt-4 pn-faint">Loading...</p>
        </div>
      </div>
    )
  }

  // Show App for authenticated users (includes homepage)
  // Show App for everyone - homepage is public, login overlay appears for protected features
  return <App />
}
