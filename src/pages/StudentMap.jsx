import { useEffect, useMemo, useRef, useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import {
  Zap, WifiOff, MapPin, AlertTriangle, Info, BellRing, ChevronUp, Gauge, Clock3, X, Bus,
} from 'lucide-react'
import LiveMap from '../components/LiveMap'
import { TopBar, Pill } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { db } from '../lib/firebase'
import { useRoutes, useBuses, useLive, useActiveAlerts, toMs, useTicker } from '../lib/data'
import { etaSeconds, fmtEta, fmtDist } from '../lib/geo'

export const OCCUPANCY = {
  seats: { label: 'Seats free', cls: 'bg-mint' },
  standing: { label: 'Standing', cls: 'bg-sun' },
  full: { label: 'Full', cls: 'bg-coral' },
}

const STALE_MS = 60_000

// buses + their live doc merged together
export function useFleet() {
  const routes = useRoutes()
  const buses = useBuses()
  const live = useLive()
  // recomputed each render (pages tick every second) so "signal lost" shows on time
  const liveById = Object.fromEntries(live.data.map((l) => [l.id, l]))
  const fleet = buses.data.map((b) => {
    const l = liveById[b.id]
    const updated = toMs(l?.updatedAt) ?? l?.clientTs
    const stale = Boolean(l?.active && updated && Date.now() - updated > STALE_MS)
    return { ...b, live: l ? { ...l, active: l.active && !stale, stale, updated } : null }
  }).sort((a, b) => (a.number || '').localeCompare(b.number || ''))
  return { routes: routes.data, fleet, loading: routes.loading || buses.loading, error: routes.error || buses.error || live.error, live: live.data }
}

// time from the driver's phone writing a point to this screen getting it
function useSyncLatency(live) {
  const seen = useRef({})
  const [latency, setLatency] = useState(null)
  useEffect(() => {
    live.forEach((l) => {
      if (l.clientTs && seen.current[l.id] !== l.clientTs) {
        if (seen.current[l.id] !== undefined) {
          const ms = Date.now() - l.clientTs
          if (ms >= 0 && ms < 10_000) setLatency(ms)
        }
        seen.current[l.id] = l.clientTs
      }
    })
  }, [live])
  return latency
}

export function ago(ms) {
  if (!ms) return 'never'
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000))
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

const ALERT_STYLE = { critical: 'bg-coral', warning: 'bg-sun', info: 'bg-lilac' }

export default function StudentMap() {
  useTicker(1000)
  const { profile, user } = useAuth()
  const { routes, fleet, live, error } = useFleet()
  const alerts = useActiveAlerts()
  const latency = useSyncLatency(live)
  const [selected, setSelected] = useState(null)
  const [flyTo, setFlyTo] = useState(null)
  const [sheetOpen, setSheetOpen] = useState(true)
  const [toast, setToast] = useState(null)
  const [dismissed, setDismissed] = useState([])
  const notified = useRef({})

  const routeById = useMemo(() => Object.fromEntries(routes.map((r) => [r.id, r])), [routes])
  const [homeRouteId, homeStopId] = (profile?.homeStop || '').split(':')
  const homeRoute = routeById[homeRouteId]
  const homeStop = homeRoute?.stops?.find((s) => s.id === homeStopId)

  const rows = fleet.map((b) => {
    const route = routeById[b.routeId]
    const eta = b.live?.active && homeStop && b.routeId === homeRouteId ? etaSeconds(route, b.live, homeStop) : null
    return { ...b, route, eta }
  }).sort((a, b) => (a.eta?.seconds ?? 1e9) - (b.eta?.seconds ?? 1e9) || (b.live?.active ? 1 : 0) - (a.live?.active ? 1 : 0))

  const liveCount = fleet.filter((b) => b.live?.active).length
  const next = rows.find((b) => b.eta)

  // ping the student when a bus is ~2 min from their stop
  useEffect(() => {
    rows.forEach((b) => {
      if (!b.eta) return
      const key = `${b.id}:${homeStopId}`
      if (b.eta.seconds < 120 && !notified.current[key]) {
        notified.current[key] = true
        const msg = `${b.number} is almost at ${homeStop.name}. Start walking!`
        setToast(msg)
        if ('Notification' in window && Notification.permission === 'granted') new Notification('RouteRadar', { body: msg, icon: '/favicon.svg' })
        if (navigator.vibrate) navigator.vibrate([200, 100, 200])
        setTimeout(() => setToast(null), 6000)
      }
      if (b.eta.seconds > 300) notified.current[key] = false
    })
  })

  async function saveStop(value) {
    await updateDoc(doc(db, 'users', user.uid), { homeStop: value || null })
    if (value && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission()
  }

  function focusBus(b) {
    setSelected(b.id)
    if (b.live?.lat) setFlyTo([b.live.lat, b.live.lng])
  }

  const visibleAlerts = alerts.data.filter((a) => !dismissed.includes(a.id))

  return (
    <div className="flex h-full flex-col">
      <TopBar>
        <div className="hidden items-center gap-2 lg:flex">
          <Pill icon={Zap} tone="lime">synced{latency != null ? ` in ${latency}ms` : ''}</Pill>
          <Pill icon={Bus} tone="sun">{liveCount} live</Pill>
        </div>
      </TopBar>

      <div className="relative flex-1 overflow-hidden">
        <LiveMap
          routes={routes}
          buses={fleet}
          selectedBusId={selected}
          onSelectBus={(id) => { setSelected(id); setSheetOpen(true) }}
          highlightStopId={profile?.homeStop}
          onStopClick={(r, s) => saveStop(`${r.id}:${s.id}`)}
          flyTo={flyTo}
        />

        {/* admin alerts */}
        <div className="pointer-events-none absolute left-1/2 top-3 z-[500] flex w-[min(92%,460px)] -translate-x-1/2 flex-col gap-2 lg:left-auto lg:right-4 lg:translate-x-0">
          {visibleAlerts.map((a) => (
            <div key={a.id} className={`pointer-events-auto flex animate-pop items-start gap-3 rounded-2xl border-2 border-ink px-4 py-3 text-sm shadow-hard ${ALERT_STYLE[a.severity] || ALERT_STYLE.info}`}>
              {a.severity === 'info' ? <Info className="mt-0.5 h-5 w-5 shrink-0" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />}
              <div className="flex-1">
                <div className="font-bold">{a.message}</div>
                <div className="mt-0.5 text-xs font-semibold opacity-60">{a.routeId ? routeById[a.routeId]?.name : 'All routes'} · {ago(toMs(a.createdAt))}</div>
              </div>
              <button onClick={() => setDismissed((d) => [...d, a.id])} className="rounded-md p-0.5 hover:bg-ink/10"><X className="h-4 w-4" /></button>
            </div>
          ))}
        </div>

        {toast && (
          <div className="absolute bottom-6 left-1/2 z-[600] flex -translate-x-1/2 animate-pop items-center gap-3 rounded-2xl border-2 border-ink bg-lime px-5 py-3 font-extrabold shadow-hard-lg">
            <BellRing className="h-5 w-5 animate-wiggle" /> {toast}
          </div>
        )}

        {/* side panel on desktop, bottom sheet on phones */}
        <aside className={`card absolute inset-x-2 bottom-2 z-[500] flex max-h-[55%] flex-col overflow-hidden transition-transform lg:inset-y-4 lg:left-4 lg:right-auto lg:max-h-none lg:w-[370px] ${sheetOpen ? '' : 'translate-y-[calc(100%-52px)] lg:translate-y-0'}`}>
          <button onClick={() => setSheetOpen((o) => !o)} className="flex items-center justify-center py-2 lg:hidden">
            <span className="h-1.5 w-10 rounded-full bg-ink/25" />
            <ChevronUp className={`absolute right-4 h-4 w-4 transition ${sheetOpen ? 'rotate-180' : ''}`} />
          </button>

          {next && (
            <div className="mx-3 mb-1 mt-1 flex items-center gap-3 rounded-xl border-2 border-ink bg-lime p-3 lg:mt-3">
              <div className="flex-1">
                <div className="text-[11px] font-extrabold uppercase tracking-wide">next bus to your stop</div>
                <div className="font-display text-lg font-extrabold leading-tight">{next.number} · {fmtEta(next.eta.seconds)}</div>
              </div>
              <span className="font-mono text-xs">{fmtDist(next.eta.metres)}</span>
            </div>
          )}

          <div className="border-b-2 border-ink px-4 pb-4 pt-2 lg:pt-3">
            <label className="label flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> my stop</label>
            <select className="input" value={profile?.homeStop || ''} onChange={(e) => saveStop(e.target.value)}>
              <option value="">Pick your stop...</option>
              {routes.map((r) => (
                <optgroup key={r.id} label={`${r.code || ''} ${r.name}`}>
                  {(r.stops || []).map((s) => <option key={s.id} value={`${r.id}:${s.id}`}>{s.name}</option>)}
                </optgroup>
              ))}
            </select>
            <p className="mt-2 text-[11px] font-medium text-ink/55">or tap a stop on the map. We’ll ping you when a bus is ~2 min away.</p>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto bg-paper/60 p-3">
            {error && <div className="rounded-xl border-2 border-ink bg-coral/30 p-3 text-sm font-semibold">Couldn’t load data: {error.code || error.message}</div>}
            {rows.length === 0 && !error && (
              <div className="p-6 text-center text-sm font-semibold text-ink/50">No buses yet. The admin needs to add them.</div>
            )}
            {rows.map((b) => {
              const on = b.live?.active
              const occ = OCCUPANCY[b.live?.occupancy]
              return (
                <button key={b.id} onClick={() => focusBus(b)}
                  className={`w-full rounded-xl border-2 border-ink bg-cream p-3 text-left transition hover:-translate-y-0.5 ${selected === b.id ? 'shadow-hard' : 'shadow-hard-sm'}`}>
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-ink font-display text-sm font-extrabold"
                      style={{ background: on ? b.route?.color || '#C6F45D' : '#e7e3da', color: on && b.route?.color === '#3D6BFF' ? '#fff' : '#141414' }}>
                      {(b.number || '').replace(/\D/g, '')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold">{b.number}</span>
                        <span className="font-mono text-[10px] text-ink/40">{b.route?.code}</span>
                      </div>
                      <div className="truncate text-xs font-medium text-ink/60">{b.route?.name || 'No route'}</div>
                    </div>
                    <div className="text-right">
                      {b.eta ? (
                        <>
                          <div className="font-display text-xl font-extrabold leading-tight">{fmtEta(b.eta.seconds)}</div>
                          <div className="font-mono text-[10px] text-ink/50">{fmtDist(b.eta.metres)}</div>
                        </>
                      ) : on ? (
                        <span className="chip bg-lime">● live</span>
                      ) : b.live?.stale ? (
                        <span className="chip bg-sun"><WifiOff className="h-3 w-3" /> lost signal</span>
                      ) : (
                        <span className="chip bg-paper text-ink/50">not running</span>
                      )}
                    </div>
                  </div>
                  {(on || b.live?.stale) && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-ink/60">
                      {occ && <span className={`chip ${occ.cls}`}>{occ.label}</span>}
                      <span className="flex items-center gap-1"><Gauge className="h-3 w-3" />{Math.round((b.live.speed || 0) * 3.6)} km/h</span>
                      <span className="flex items-center gap-1"><Clock3 className="h-3 w-3" />{ago(b.live.updated)}</span>
                      {b.live.driverName && <span className="ml-auto truncate">{b.live.driverName}</span>}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </aside>
      </div>
    </div>
  )
}
