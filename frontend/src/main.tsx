import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import './index.css'
import AppWrapper from './AppWrapper.tsx'
import { store } from './store/store'
import { ErrorBoundary } from './components/ErrorBoundary'

const AppErrorFallback = () => (
  <div className="w-screen h-screen flex items-center justify-center bg-pn-solid-bg text-pn-text" style={{
    backgroundColor: 'var(--pn-solid-bg, #1e1e1e)',
    color: 'var(--pn-text, #e0e0e0)',
  }}>
    <div className="text-center">
      <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
      <p className="text-sm mb-6 opacity-75">PrismNote encountered an unexpected error. Please reload.</p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded text-white font-medium"
      >
        Reload PrismNote
      </button>
    </div>
  </div>
)

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary fallback={<AppErrorFallback />}>
    <Provider store={store}>
      <AppWrapper />
    </Provider>
  </ErrorBoundary>
)
