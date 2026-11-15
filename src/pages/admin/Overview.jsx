import { useState } from 'react'
import { orderBy, limit } from 'firebase/firestore'
import {
  Bus, Users, Activity, MonitorSmartphone, Database, Globe2, ShieldCheck, Server, Sparkles, Loader2, Smartphone, Monitor, ChevronRight,
} from 'lucide-react'
import LiveMap from '../../components/LiveMap'
import { Stat, PageTitle, ErrorBox, LiveDot } from '../../components/ui'
import { useCollection, toMs, useTicker } from '../../lib/data'
import { useFleet, ago, BusBadge } from '../StudentMap'
import { seedDemoData } from '../../lib/seed'
import { fmtDist } from '../../lib/geo'

const ONLINE_MS = 60_000

export default function Overview() {
  useTicker(2000)
  const { routes, fleet, loading } = useFleet()
  const presence = useCollection('presence')
  const trips = useCollection('trips', [orderBy('startedAt', 'desc'), limit(50)])
  const [seeding, setSeeding] = useState(false)
  const [seedError, setSeedError] = useState('')

  const online = presence.data.filter((p) => Date.now() - (toMs(p.lastSeen) || 0) < ONLINE_MS)
  const byRole = (r) => online.filter((p) => p.role === r).length
  const liveBuses = fleet.filter((b) => b.live?.active)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tripsToday = trips.data.filter((t) => (toMs(t.startedAt) || 0) >= today.getTime())
  const kmToday = tripsToday.reduce((a, t) => a + (t.distance || 0), 0)
  const phones = online.filter((p) => p.ua === 'mobile').length
  const routeOf = (b) => routes.find((r) => r.id === b.routeId)

  async function seed() {
    setSeeding(true); setSeedError('')
    try { await seedDemoData() } catch (e) { setSeedError(e.code || e.message) } finally { setSeeding(false) }
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Dashboard" sub="Everything here updates live.">
        {!loading && fleet.length === 0 && (
          <button onClick={seed} disabled={seeding} className="btn-primary">
            {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Load sample routes and buses
          </button>
        )}
      </PageTitle>
      <ErrorBox>{seedError}</ErrorBox>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Buses live" value={`${liveBuses.length} / ${fleet.length}`} sub="sharing location now" icon={Bus} tone="lime" />
        <Stat label="People online" value={online.length} sub={['student', 'driver', 'admin'].map((r) => `${byRole(r)} ${r}${byRole(r) === 1 ? '' : 's'}`).join(' · ')} icon={Users} tone="violet" />
        <Stat label="Trips today" value={tripsToday.length} sub={`${fmtDist(kmToday)} driven`} icon={Activity} tone="amber" />
        <Stat label="Devices" value={online.length} sub={`${phones} phone${phones === 1 ? '' : 's'} · ${online.length - phones} laptop${online.length - phones === 1 ? '' : 's'}`} icon={MonitorSmartphone} tone="pink" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="card h-[440px] overflow-hidden p-0"><LiveMap routes={routes} buses={fleet} /></div>
        <div className="card flex flex-col p-5">
          <h2 className="text-lg font-bold">Fleet</h2>
          <div className="-mx-2 mt-3 flex-1 overflow-y-auto">
            {fleet.length === 0 && <p className="px-2 text-sm text-muted">No buses yet.</p>}
            {fleet.map((b) => (
              <div key={b.id} className="flex items-center gap-3 rounded-2xl px-2 py-2.5 hover:bg-canvas">
                <BusBadge bus={b} route={routeOf(b)} size="h-10 w-10 text-sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-semibold">{b.number}{b.live?.active && <LiveDot />}</div>
                  <div className="truncate text-xs text-muted">{b.live?.driverName || 'No driver'} · {ago(b.live?.updated)}</div>
                </div>
                <span className="text-xs font-medium text-muted">{b.live?.active ? `${Math.round((b.live.speed || 0) * 3.6)} km/h` : b.live?.stale ? 'lost signal' : 'idle'}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t border-line pt-4">
            <div className="eyebrow">Online now</div>
            <div className="mt-2 max-h-32 space-y-2 overflow-y-auto">
              {online.length === 0 && <p className="text-xs text-muted">Nobody right now.</p>}
              {online.map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-xs">
                  {p.ua === 'mobile' ? <Smartphone className="h-3.5 w-3.5 text-muted" /> : <Monitor className="h-3.5 w-3.5 text-muted" />}
                  <span className="capitalize">{p.role}</span>
                  <span className="ml-auto font-mono text-[10px] text-muted">{p.id.slice(0, 8)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-bold">How it’s wired</h2>
        <p className="mt-1 text-sm text-muted">You pay per read and write, not for servers sitting idle.</p>
        <div className="mt-5 flex flex-col gap-2 md:flex-row md:items-center">
          {[
            { icon: Smartphone, t: 'Driver phone', d: 'GPS, filtered on device' },
            { icon: ShieldCheck, t: 'Auth + rules', d: 'Identity and roles' },
            { icon: Database, t: 'Firestore', d: 'Realtime database' },
            { icon: Server, t: 'Cloud Functions', d: 'Cleanup, audit log' },
            { icon: Globe2, t: 'Vercel CDN', d: 'Serves the web app' },
          ].map(({ icon: I, t, d }, i, arr) => (
            <div key={t} className="flex flex-1 items-center gap-2">
              <div className="flex flex-1 items-center gap-3 rounded-2xl bg-canvas p-3.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface shadow-soft"><I className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{t}</div>
                  <div className="truncate text-xs text-muted">{d}</div>
                </div>
              </div>
              {i < arr.length - 1 && <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted md:block" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
