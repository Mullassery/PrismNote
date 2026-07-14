import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import './index.css'
import AppWrapper from './AppWrapper.tsx'
import { store } from './store/store'

createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <AppWrapper />
  </Provider>
)
