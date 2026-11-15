import { useState } from 'react'
import { orderBy, limit } from 'firebase/firestore'
import {
  Bus, Users, Activity, MonitorSmartphone, Database, Globe2, ShieldCheck, Server, Sparkles, Loader2, Smartphone, Monitor, ArrowRight,
} from 'lucide-react'
import LiveMap from '../../components/LiveMap'
import { Stat, PageTitle, ErrorBox } from '../../components/ui'
import { useCollection, toMs, useTicker } from '../../lib/data'
import { useFleet, ago } from '../StudentMap'
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

  async function seed() {
    setSeeding(true); setSeedError('')
    try { await seedDemoData() } catch (e) { setSeedError(e.code || e.message) } finally { setSeeding(false) }
  }

  return (
    <div className="space-y-6">
      <PageTitle title="Dashboard" sub="Everything here updates live. No refreshing needed.">
        {!loading && fleet.length === 0 && (
          <button onClick={seed} disabled={seeding} className="btn-primary">
            {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Load sample routes + buses
          </button>
        )}
      </PageTitle>
      <ErrorBox>{seedError}</ErrorBox>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Stat label="Buses live" value={`${liveBuses.length}/${fleet.length}`} sub="sharing location now" icon={Bus} color="bg-lime" />
        <Stat label="Online" value={online.length} sub={['student', 'driver', 'admin'].map((r) => `${byRole(r)} ${r}${byRole(r) === 1 ? '' : 's'}`).join(' · ')} icon={Users} color="bg-pink" />
        <Stat label="Trips today" value={tripsToday.length} sub={`${fmtDist(kmToday)} driven`} icon={Activity} color="bg-sun" />
        <Stat label="Devices" value={`${phones} / ${online.length - phones}`} sub="phones / laptops" icon={MonitorSmartphone} color="bg-lilac" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="card h-[420px] overflow-hidden"><LiveMap routes={routes} buses={fleet} /></div>
        <div className="card flex flex-col p-5">
          <h2 className="text-lg font-extrabold">Fleet right now</h2>
          <div className="mt-3 flex-1 space-y-2 overflow-y-auto">
            {fleet.length === 0 && <p className="text-sm font-medium text-ink/50">No buses yet.</p>}
            {fleet.map((b) => (
              <div key={b.id} className="flex items-center gap-3 rounded-xl border-2 border-ink bg-paper px-3 py-2">
                <span className={`h-3 w-3 rounded-full border-2 border-ink ${b.live?.active ? 'bg-lime' : b.live?.stale ? 'bg-sun' : 'bg-ink/15'}`} />
                <div className="flex-1">
                  <div className="text-sm font-extrabold">{b.number}</div>
                  <div className="text-[11px] font-medium text-ink/55">{b.live?.driverName || 'no driver'} · {ago(b.live?.updated)}</div>
                </div>
                <span className="font-mono text-xs">{b.live?.active ? `${Math.round((b.live.speed || 0) * 3.6)} km/h` : b.live?.stale ? 'lost' : 'idle'}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t-2 border-dashed border-ink/20 pt-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-ink/55">who’s online</h3>
            <div className="mt-2 max-h-36 space-y-1.5 overflow-y-auto">
              {online.length === 0 && <p className="text-xs font-medium text-ink/50">Nobody right now.</p>}
              {online.map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-xs font-semibold">
                  {p.ua === 'mobile' ? <Smartphone className="h-3.5 w-3.5" /> : <Monitor className="h-3.5 w-3.5" />}
                  <span className="capitalize">{p.role}</span>
                  <span className="ml-auto font-mono text-[10px] text-ink/40">{p.id.slice(0, 8)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-extrabold">How it’s wired</h2>
        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-stretch">
          {[
            { icon: Smartphone, t: 'Driver phone', d: 'GPS, filtered on the phone', c: 'bg-sun' },
            { icon: ShieldCheck, t: 'Auth + rules', d: 'who are you, what can you do', c: 'bg-pink' },
            { icon: Database, t: 'Firestore', d: 'realtime database', c: 'bg-lime' },
            { icon: Server, t: 'Cloud Functions', d: 'cleanup + audit log', c: 'bg-lilac' },
            { icon: Globe2, t: 'Vercel CDN', d: 'serves the website', c: 'bg-mint' },
          ].map(({ icon: I, t, d, c }, i, arr) => (
            <div key={t} className="flex flex-1 items-center gap-3">
              <div className={`flex-1 rounded-xl border-2 border-ink ${c} p-4`}>
                <I className="h-5 w-5" />
                <div className="mt-2 text-sm font-extrabold">{t}</div>
                <div className="text-xs font-medium text-ink/65">{d}</div>
              </div>
              {i < arr.length - 1 && <ArrowRight className="hidden h-5 w-5 shrink-0 md:block" />}
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs font-medium text-ink/55">You pay per read / write, not for servers sitting idle (utility computing).</p>
      </div>
    </div>
  )
}
