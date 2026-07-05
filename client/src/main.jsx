import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

const AbletonDeviceMapper = lazy(() => import('./AbletonDeviceMapper.jsx'))
const isAbletonDeviceMapper = window.location.pathname.replace(/\/+$/, '') === '/ableton-device-mapper'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isAbletonDeviceMapper
      ? <Suspense fallback={<div className="route-loading">Loading Ableton Device Mapper…</div>}><AbletonDeviceMapper /></Suspense>
      : <App />}
  </React.StrictMode>,
)
