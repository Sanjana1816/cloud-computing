import { useEffect, useMemo, useState } from 'react'
import {
  Play, Square, Satellite, Route as RouteIcon, ShieldCheck, Clock3, Gauge, Navigation2, Cpu, UploadCloud, Filter, Bus, Loader2,
} from 'lucide-react'
import LiveMap from '../components/LiveMap'
import { TopBar, ErrorBox } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useTripBroadcaster } from '../lib/broadcaster'
import { useFleet, OCCUPANCY, BusBadge } from './PassengerMap'
import { useTicker } from '../lib/data'
import { fmtDist } from '../lib/geo'

function Waiting({ icon: I, title, text, tone }) {
  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <div className="grid flex-1 place-items-center p-6">
        <div className="card max-w-md p-10 text-center">
          <span className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${tone}`}><I className="h-7 w-7" /></span>
          <h1 className="mt-6 text-2xl font-extrabold">{title}</h1>
          <p className="mt-2 leading-relaxed text-muted">{text}</p>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-canvas px-3 py-1.5 text-xs text-muted"><Loader2 className="h-3.5 w-3.5 animate-spin" /> This page updates by itself</p>
        </div>
      </div>
    </div>
  )
}

function clock(ms) {
  const s = Math.floor(ms / 1000)
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function DriverConsole() {
  useTicker(1000)
  const { user, profile } = useAuth()
  const { routes, fleet, loading } = useFleet()
  const isAdmin = profile.role === 'admin'
  const [adminBusId, setAdminBusId] = useState('')

  const busId = isAdmin ? adminBusId : profile.busId
  const bus = fleet.find((b) => b.id === busId)
  const route = routes.find((r) => r.id === bus?.routeId)
  const t = useTripBroadcaster({ bus, route, user, profile })

  useEffect(() => { if (isAdmin && !adminBusId && fleet[0]) setAdminBusId(fleet[0].id) }, [isAdmin, fleet, adminBusId])

  const mapRoutes = useMemo(() => (route ? [route] : routes), [route, routes])

  if (!isAdmin && !profile.approved) {
    return <Waiting icon={ShieldCheck} tone="bg-amber-soft text-amber-deep" title="Waiting for approval"
      text="The depot admin has to verify you before you can share a bus location. Ask them to approve you from the admin panel." />
  }
  if (!isAdmin && !profile.busId) {
    return <Waiting icon={Bus} tone="bg-lime-soft text-lime-deep" title="You’re verified" text="Now the depot admin just needs to assign you a bus." />
  }
  if (!loading && !bus && !isAdmin) {
    return <Waiting icon={Bus} tone="bg-red-soft text-red" title="Bus not found" text="The bus you were assigned was removed. Ask the admin for another one." />
  }

  const saved = t.sent + t.filtered > 0 ? Math.round((t.filtered / (t.sent + t.filtered)) * 100) : 0

  return (
    <div className="flex h-full flex-col">
      <TopBar />

      <div className="grid flex-1 overflow-hidden lg:grid-cols-[420px_1fr]">
        <div className="order-2 space-y-4 overflow-y-auto p-4 lg:order-1 lg:p-5">
          <div className="card p-5">
            {isAdmin ? (
              <>
                <label className="label">Bus (admins can pick any)</label>
                <select className="input" value={adminBusId} disabled={t.running} onChange={(e) => setAdminBusId(e.target.value)}>
                  {fleet.map((b) => <option key={b.id} value={b.id}>{b.number} · {routes.find((r) => r.id === b.routeId)?.name || 'no route'}</option>)}
                </select>
              </>
            ) : bus && (
              <div className="flex items-center gap-4">
                <BusBadge bus={{ ...bus, live: { active: true } }} route={route} size="h-14 w-14 text-lg" />
                <div>
                  <div className="font-display text-xl font-extrabold">{bus.number}</div>
                  <div className="text-sm text-muted">{bus.plate}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted"><RouteIcon className="h-3.5 w-3.5" />{route ? `Route ${route.code} · ${route.name}` : 'No route set'}</div>
                </div>
              </div>
            )}
          </div>

          <div className={`rounded-3xl p-5 transition ${t.running ? 'bg-ink text-white' : 'card'}`}>
            {!t.running ? (
              <div className="space-y-3">
                <button disabled={!bus} onClick={() => t.start('gps')}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-lime py-5 font-display text-2xl font-extrabold transition hover:brightness-95 active:scale-[.98] disabled:opacity-40">
                  <Play className="h-6 w-6 fill-current" /> Start trip
                </button>
                <button disabled={!bus || !route} onClick={() => t.start('sim', bus?.live?.lat ? bus.live : null)} className="btn-ghost w-full">
                  <Satellite className="h-4 w-4" /> Demo mode
                </button>
                <p className="text-center text-xs text-muted">Demo mode drives along the route for indoor presentations. It runs through the same code as real GPS.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-lime">On trip{t.mode === 'sim' ? ' (demo)' : ''}</span>
                  <span className="font-mono text-2xl">{clock(Date.now() - t.startedAt)}</span>
                </div>
                <button onClick={t.stop}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-red py-5 font-display text-2xl font-extrabold text-white transition hover:brightness-95 active:scale-[.98]">
                  <Square className="h-5 w-5 fill-current" /> End trip
                </button>
              </div>
            )}
            {t.error && <div className="mt-3"><ErrorBox>{t.error}</ErrorBox></div>}
          </div>

          <div className="card p-5">
            <label className="label">How full is the bus?</label>
            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-canvas p-1">
              {Object.entries(OCCUPANCY).map(([k, v]) => (
                <button key={k} onClick={() => t.setOccupancy(k)}
                  className={`rounded-xl py-2.5 text-sm font-semibold transition ${t.occupancy === k ? `${v.on} shadow-soft` : 'text-muted hover:text-ink'}`}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div className="card grid grid-cols-2 divide-x divide-y divide-line overflow-hidden p-0">
            <MiniStat icon={Navigation2} label="Distance" value={fmtDist(t.distance)} />
            <MiniStat icon={Gauge} label="GPS accuracy" value={t.lastFix?.accuracy ? `±${Math.round(t.lastFix.accuracy)} m` : '-'} />
            <MiniStat icon={UploadCloud} label="Sent to cloud" value={t.sent} />
            <MiniStat icon={Filter} label="Filtered on phone" value={`${t.filtered} (${saved}%)`} />
          </div>

          <div className="rounded-3xl bg-violet-soft p-5 text-sm leading-relaxed text-violet-deep">
            <div className="mb-1.5 flex items-center gap-2 font-semibold"><Cpu className="h-4 w-4" /> Edge computing</div>
            This phone works out speed and direction itself, drops bad GPS points, and only uploads when the bus actually moves
            (at most every 2 s, with a check-in every 10 s). That means less load on the database and a smaller bill.
          </div>
          <div className="flex items-center gap-2 px-1 text-xs text-muted"><Clock3 className="h-3.5 w-3.5" />Keep this page open while driving. If it closes, passengers see “lost signal” after 60 s.</div>
        </div>

        <div className="order-1 h-[40vh] lg:order-2 lg:h-auto">
          <LiveMap routes={mapRoutes} buses={bus ? [bus] : []} selectedBusId={bus?.id}
            flyTo={t.running && t.lastFix ? [t.lastFix.lat, t.lastFix.lng] : null} />
        </div>
      </div>
    </div>
  )
}

function MiniStat({ icon: I, label, value }) {
  return (
    <div className="p-4">
      <div className="flex items-center gap-1.5 text-xs text-muted"><I className="h-3.5 w-3.5" />{label}</div>
      <div className="mt-1 font-display text-xl font-extrabold">{value}</div>
    </div>
  )
}
