import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import './monotype-theme.css'

const AbletonDeviceMapper = lazy(() => import('./AbletonDeviceMapper.jsx'))
const routeParams = new URLSearchParams(window.location.search)
const mapperQuery = routeParams.get('mapper')
const legacyAbletonPath = window.location.pathname.replace(/\/+$/, '') === '/ableton-device-mapper'

if (!mapperQuery && !legacyAbletonPath) {
  routeParams.set('mapper', 'm4l')
  const canonicalUrl = `${window.location.pathname}?${routeParams.toString()}${window.location.hash}`
  window.history.replaceState(window.history.state, '', canonicalUrl)
}

const isAbletonDeviceMapper = mapperQuery === 'ableton' || (mapperQuery !== 'm4l' && legacyAbletonPath)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isAbletonDeviceMapper
      ? <Suspense fallback={<div className="route-loading">Loading Ableton Device Mapper…</div>}><AbletonDeviceMapper /></Suspense>
      : <App />}
  </React.StrictMode>,
)
