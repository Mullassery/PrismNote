import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import App from './App'

/**
 * Wrapper component that handles authentication
 * Shows Login page if not authenticated, otherwise shows App
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

  if (!isAuthenticated) {
    return <Login />
  }

  return <App />
}
