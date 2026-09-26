import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import './index.css'
import AppWrapper from './AppWrapper.tsx'
import { store } from './store/store'
import { ErrorBoundary } from './components/ErrorBoundary'
import AppErrorFallback from './components/AppErrorFallback'

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary fallback={<AppErrorFallback />}>
    <Provider store={store}>
      <AppWrapper />
    </Provider>
  </ErrorBoundary>
)
