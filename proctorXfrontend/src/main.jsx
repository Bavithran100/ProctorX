import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import './AdminMonitoring.css'
import App from './App.jsx'
import AppRouter from './app/router/AppRouter.jsx'
import { Provider } from 'react-redux'
import store from './shared/state/Store.jsx'
import AppInitializer from './app/providers/AppInitializer.jsx'

createRoot(document.getElementById('root')).render(

      <Provider store={store}>
      <AppInitializer>
        <AppRouter />
      </AppInitializer>
    </Provider>

)
