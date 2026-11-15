import { useEffect, useMemo, useState } from 'react'
import {
  Play, Square, Satellite, Route as RouteIcon, ShieldAlert, Clock3, Gauge, Navigation2, Cpu, UploadCloud, Filter, Bus, Loader2,
} from 'lucide-react'
import LiveMap from '../components/LiveMap'
import { TopBar, Pill, ErrorBox } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useTripBroadcaster } from '../lib/broadcaster'
import { useFleet, OCCUPANCY } from './StudentMap'
import { useTicker } from '../lib/data'
import { fmtDist } from '../lib/geo'

function Waiting({ icon: I, title, text, color }) {
  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <div className="grid flex-1 place-items-center p-6">
        <div className="card max-w-md p-8 text-center">
          <span className={`mx-auto grid h-16 w-16 -rotate-6 place-items-center rounded-2xl border-2 border-ink ${color} shadow-hard`}><I className="h-8 w-8" /></span>
          <h1 className="mt-6 text-3xl font-extrabold">{title}</h1>
          <p className="mt-2 font-medium text-ink/65">{text}</p>
          <p className="mt-6 inline-flex items-center gap-2 rounded-full border-2 border-ink bg-paper px-3 py-1 text-xs font-bold"><Loader2 className="h-3.5 w-3.5 animate-spin" /> this page updates by itself</p>
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
    return <Waiting icon={ShieldAlert} color="bg-sun" title="hang tight!"
      text="The transport admin has to verify you before you can share the bus location. It’s a safety thing. Ask them to approve you from the admin panel." />
  }
  if (!isAdmin && !profile.busId) {
    return <Waiting icon={Bus} color="bg-lime" title="you’re verified ✓" text="Now the admin just needs to give you a bus." />
  }
  if (!loading && !bus && !isAdmin) {
    return <Waiting icon={Bus} color="bg-coral" title="bus not found" text="The bus you were assigned was removed. Ask the admin for another one." />
  }

  const saved = t.sent + t.filtered > 0 ? Math.round((t.filtered / (t.sent + t.filtered)) * 100) : 0

  return (
    <div className="flex h-full flex-col">
      <TopBar>
        <div className="hidden items-center gap-2 md:flex">
          <Pill icon={UploadCloud} tone="lime">{t.sent} sent</Pill>
          <Pill icon={Filter} tone="lilac">{t.filtered} filtered</Pill>
        </div>
      </TopBar>

      <div className="grid flex-1 overflow-hidden lg:grid-cols-[430px_1fr]">
        <div className="order-2 space-y-4 overflow-y-auto border-r-2 border-ink p-4 lg:order-1 lg:p-5">
          <div className="card p-5">
            {isAdmin ? (
              <>
                <label className="label">Bus (admin can pick any)</label>
                <select className="input" value={adminBusId} disabled={t.running} onChange={(e) => setAdminBusId(e.target.value)}>
                  {fleet.map((b) => <option key={b.id} value={b.id}>{b.number} · {routes.find((r) => r.id === b.routeId)?.name || 'no route'}</option>)}
                </select>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <span className="grid h-14 w-14 place-items-center rounded-xl border-2 border-ink font-display text-xl font-extrabold shadow-hard-sm"
                  style={{ background: route?.color || '#C6F45D', color: route?.color === '#3D6BFF' ? '#fff' : '#141414' }}>
                  {(bus?.number || '').replace(/\D/g, '')}
                </span>
                <div>
                  <div className="font-display text-xl font-extrabold">{bus?.number}</div>
                  <div className="font-mono text-xs text-ink/60">{bus?.plate}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-ink/60"><RouteIcon className="h-3.5 w-3.5" />{route?.name || 'No route set'}</div>
                </div>
              </div>
            )}
          </div>

          <div className="card p-5">
            {!t.running ? (
              <div className="space-y-3">
                <button disabled={!bus} onClick={() => t.start('gps')}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-ink bg-lime py-6 font-display text-2xl font-extrabold shadow-hard transition hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-40">
                  <Play className="h-7 w-7 fill-current" /> Start trip
                </button>
                <button disabled={!bus || !route} onClick={() => t.start('sim', bus?.live?.lat ? bus.live : null)} className="btn-ghost w-full">
                  <Satellite className="h-4 w-4" /> Demo mode (fake drive along the route)
                </button>
                <p className="text-center text-[11px] font-medium text-ink/50">Use demo mode when presenting indoors. It goes through the same code as real GPS.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="chip bg-lime">
                    <span className="relative flex h-2 w-2"><span className="absolute inset-0 animate-ping rounded-full bg-ink" /><span className="relative h-2 w-2 rounded-full bg-ink" /></span>
                    on air {t.mode === 'sim' ? '(demo)' : ''}
                  </span>
                  <span className="font-mono text-2xl">{clock(Date.now() - t.startedAt)}</span>
                </div>
                <button onClick={t.stop}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-ink bg-coral py-6 font-display text-2xl font-extrabold shadow-hard transition active:translate-x-1 active:translate-y-1 active:shadow-none">
                  <Square className="h-6 w-6 fill-current" /> End trip
                </button>
              </div>
            )}
            {t.error && <div className="mt-3"><ErrorBox>{t.error}</ErrorBox></div>}
          </div>

          <div className="card p-5">
            <label className="label">How packed is it?</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(OCCUPANCY).map(([k, v]) => (
                <button key={k} onClick={() => t.setOccupancy(k)}
                  className={`rounded-xl border-2 border-ink px-2 py-3 text-sm font-extrabold transition ${t.occupancy === k ? `${v.cls} shadow-hard-sm` : 'bg-cream hover:bg-paper'}`}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MiniStat icon={Navigation2} label="Distance" value={fmtDist(t.distance)} color="bg-sun" />
            <MiniStat icon={Gauge} label="GPS accuracy" value={t.lastFix?.accuracy ? `±${Math.round(t.lastFix.accuracy)} m` : '-'} color="bg-lilac" />
            <MiniStat icon={UploadCloud} label="Sent to cloud" value={t.sent} color="bg-lime" />
            <MiniStat icon={Filter} label="Filtered on phone" value={`${t.filtered} (${saved}%)`} color="bg-pink" />
          </div>

          <div className="rounded-2xl border-2 border-dashed border-ink bg-mint/40 p-4 text-xs font-medium leading-relaxed">
            <div className="mb-1 flex items-center gap-1.5 text-sm font-extrabold"><Cpu className="h-4 w-4" /> edge computing, live</div>
            This phone works out speed and direction itself, throws away bad GPS points, and only uploads when the bus actually moves
            (max once every 2s, plus a check-in every 10s). Fewer uploads = less load on the database and a smaller bill.
          </div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-ink/50"><Clock3 className="h-3 w-3" />Keep this screen open while driving. If it closes, students see “lost signal” after 60s.</div>
        </div>

        <div className="order-1 h-[40vh] border-b-2 border-ink lg:order-2 lg:h-auto lg:border-b-0">
          <LiveMap routes={mapRoutes} buses={bus ? [bus] : []} selectedBusId={bus?.id}
            flyTo={t.running && t.lastFix ? [t.lastFix.lat, t.lastFix.lng] : null} />
        </div>
      </div>
    </div>
  )
}

function MiniStat({ icon: I, label, value, color }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-ink/55">
        <span className={`grid h-5 w-5 place-items-center rounded-md border-2 border-ink ${color}`}><I className="h-3 w-3" /></span>{label}
      </div>
      <div className="mt-1.5 font-display text-xl font-extrabold">{value}</div>
    </div>
  )
}
