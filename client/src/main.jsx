import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

const AbletonDeviceMapper = lazy(() => import('./AbletonDeviceMapper.jsx'))
const mapperQuery = new URLSearchParams(window.location.search).get('mapper')
const legacyAbletonPath = window.location.pathname.replace(/\/+$/, '') === '/ableton-device-mapper'
const isAbletonDeviceMapper = mapperQuery === 'ableton' || (mapperQuery !== 'm4l' && legacyAbletonPath)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isAbletonDeviceMapper
      ? <Suspense fallback={<div className="route-loading">Loading Ableton Device Mapper…</div>}><AbletonDeviceMapper /></Suspense>
      : <App />}
  </React.StrictMode>,
)
