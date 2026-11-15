import { useEffect, useMemo, useRef, useState } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import {
  Zap, WifiOff, MapPin, AlertTriangle, Info, BellRing, Gauge, Clock3, X, Bus, ChevronDown,
} from 'lucide-react'
import LiveMap, { isLight } from '../components/LiveMap'
import { TopBar, Pill, LiveDot } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { db } from '../lib/firebase'
import { useRoutes, useBuses, useLive, useActiveAlerts, toMs, useTicker } from '../lib/data'
import { etaSeconds, fmtEta, fmtDist } from '../lib/geo'

export const OCCUPANCY = {
  seats: { label: 'Seats free', cls: 'bg-lime-soft text-lime-deep', on: 'bg-lime text-ink' },
  standing: { label: 'Standing', cls: 'bg-amber-soft text-amber-deep', on: 'bg-amber text-ink' },
  full: { label: 'Full', cls: 'bg-red-soft text-red', on: 'bg-red text-white' },
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

const ALERT_STYLE = {
  critical: { icon: AlertTriangle, cls: 'bg-red-soft text-red' },
  warning: { icon: AlertTriangle, cls: 'bg-amber-soft text-amber-deep' },
  info: { icon: Info, cls: 'bg-violet-soft text-violet-deep' },
}

export function BusBadge({ bus, route, size = 'h-11 w-11 text-sm' }) {
  const on = bus.live?.active
  const color = route?.color || '#111111'
  const bg = on ? (isLight(color) ? '#111111' : color) : '#E7E5DE'
  return (
    <span className={`grid shrink-0 place-items-center rounded-2xl font-display font-extrabold ${size}`} style={{ background: bg, color: on ? '#fff' : '#6E6C66' }}>
      {(bus.number || '').replace(/\D/g, '')}
    </span>
  )
}

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
        const msg = `${b.number} is almost at ${homeStop.name}. Time to head out!`
        setToast(msg)
        if ('Notification' in window && Notification.permission === 'granted') new Notification('routeradar', { body: msg, icon: '/favicon.svg' })
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
  const firstName = (profile?.name || '').split(' ')[0]

  return (
    <div className="flex h-full flex-col">
      <TopBar>
        <div className="hidden items-center gap-2 lg:flex">
          <Pill icon={Zap} tone="lime">Synced{latency != null ? ` in ${latency} ms` : ''}</Pill>
          <Pill icon={Bus} tone="gray">{liveCount} live</Pill>
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
          fitPadding={window.innerWidth >= 1024 ? [[420, 60], [60, 60]] : [[30, 30], [30, 340]]}
        />

        {/* admin alerts */}
        <div className="pointer-events-none absolute left-1/2 top-4 z-[500] flex w-[min(92%,420px)] -translate-x-1/2 flex-col gap-2 lg:left-auto lg:right-4 lg:translate-x-0">
          {visibleAlerts.map((a) => {
            const A = ALERT_STYLE[a.severity] || ALERT_STYLE.info
            return (
              <div key={a.id} className="pointer-events-auto flex animate-pop items-start gap-3 rounded-2xl bg-surface p-3.5 shadow-lift ring-1 ring-line">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${A.cls}`}><A.icon className="h-4 w-4" /></span>
                <div className="flex-1 pt-0.5">
                  <div className="text-sm font-semibold leading-snug">{a.message}</div>
                  <div className="mt-1 text-xs text-muted">{a.routeId ? routeById[a.routeId]?.name : 'All routes'} · {ago(toMs(a.createdAt))}</div>
                </div>
                <button onClick={() => setDismissed((d) => [...d, a.id])} className="rounded-full p-1 text-muted hover:bg-canvas hover:text-ink"><X className="h-4 w-4" /></button>
              </div>
            )
          })}
        </div>

        {toast && (
          <div className="absolute bottom-6 left-1/2 z-[600] flex -translate-x-1/2 animate-pop items-center gap-3 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white shadow-lift">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-lime text-ink"><BellRing className="h-4 w-4" /></span> {toast}
          </div>
        )}

        {/* side panel on desktop, bottom sheet on phones */}
        <aside className={`absolute inset-x-2 bottom-2 z-[500] flex max-h-[58%] flex-col overflow-hidden rounded-3xl bg-surface shadow-lift ring-1 ring-line transition-transform duration-300 lg:inset-y-4 lg:left-4 lg:right-auto lg:max-h-none lg:w-[380px] ${sheetOpen ? '' : 'translate-y-[calc(100%-56px)] lg:translate-y-0'}`}>
          <button onClick={() => setSheetOpen((o) => !o)} className="flex items-center justify-center pt-2.5 lg:hidden" aria-label="Toggle panel">
            <span className="h-1 w-10 rounded-full bg-line" />
          </button>

          <div className="space-y-4 p-5 pb-4">
            <div>
              <div className="text-sm text-muted">Hi {firstName}</div>
              <h2 className="text-2xl font-extrabold">Where’s my bus?</h2>
            </div>

            {next ? (
              <div className="rounded-2xl bg-ink p-4 text-white">
                <div className="flex items-center gap-3">
                  <BusBadge bus={next} route={next.route} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-white/50">Next to {homeStop?.name}</div>
                    <div className="font-semibold">{next.number}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-3xl font-extrabold leading-none text-lime">{fmtEta(next.eta.seconds)}</div>
                    <div className="mt-1 text-[11px] text-white/50">{fmtDist(next.eta.metres)} away</div>
                  </div>
                </div>
              </div>
            ) : homeStop ? (
              <div className="rounded-2xl bg-canvas p-4 text-sm text-muted">No bus is heading to <b className="text-ink">{homeStop.name}</b> right now.</div>
            ) : null}

            <div>
              <label className="label">My stop</label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <select className="input appearance-none pl-10 pr-10" value={profile?.homeStop || ''} onChange={(e) => saveStop(e.target.value)}>
                  <option value="">Pick your stop</option>
                  {routes.map((r) => (
                    <optgroup key={r.id} label={`${r.code || ''} ${r.name}`}>
                      {(r.stops || []).map((s) => <option key={s.id} value={`${r.id}:${s.id}`}>{s.name}</option>)}
                    </optgroup>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              </div>
              <p className="mt-2 text-xs text-muted">You can also tap a stop on the map. We’ll ping you when a bus is about 2 min away.</p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-line px-5 pb-1 pt-4">
            <span className="eyebrow">All buses</span>
            <span className="text-xs text-muted">{liveCount} of {fleet.length} running</span>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {error && <div className="m-3 rounded-2xl bg-red-soft p-3 text-sm text-red">Couldn’t load data: {error.code || error.message}</div>}
            {rows.length === 0 && !error && (
              <div className="p-8 text-center text-sm text-muted">No buses yet. The admin needs to add them.</div>
            )}
            {rows.map((b) => {
              const on = b.live?.active
              const occ = OCCUPANCY[b.live?.occupancy]
              return (
                <button key={b.id} onClick={() => focusBus(b)}
                  className={`w-full rounded-2xl p-3 text-left transition hover:bg-canvas ${selected === b.id ? 'bg-canvas' : ''}`}>
                  <div className="flex items-center gap-3">
                    <BusBadge bus={b} route={b.route} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 font-semibold">
                        {b.number}
                        {on && <LiveDot />}
                      </div>
                      <div className="truncate text-xs text-muted">{b.route?.name || 'No route'}</div>
                    </div>
                    <div className="text-right">
                      {b.eta ? (
                        <>
                          <div className="font-display text-lg font-extrabold leading-tight">{fmtEta(b.eta.seconds)}</div>
                          <div className="text-[11px] text-muted">{fmtDist(b.eta.metres)}</div>
                        </>
                      ) : on ? (
                        <span className="chip bg-lime-soft text-lime-deep">Live</span>
                      ) : b.live?.stale ? (
                        <span className="chip bg-amber-soft text-amber-deep"><WifiOff className="h-3 w-3" /> Lost signal</span>
                      ) : (
                        <span className="text-xs text-muted">Not running</span>
                      )}
                    </div>
                  </div>
                  {on && (
                    <div className="ml-14 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                      {occ && <span className={`chip !py-0.5 ${occ.cls}`}>{occ.label}</span>}
                      <span className="flex items-center gap-1"><Gauge className="h-3 w-3" />{Math.round((b.live.speed || 0) * 3.6)} km/h</span>
                      <span className="flex items-center gap-1"><Clock3 className="h-3 w-3" />{ago(b.live.updated)}</span>
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
