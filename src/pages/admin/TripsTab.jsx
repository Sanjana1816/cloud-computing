import { orderBy, limit } from 'firebase/firestore'
import { History, Satellite, MapPinned } from 'lucide-react'
import { useCollection, useBuses, toMs } from '../../lib/data'
import { fmtDist } from '../../lib/geo'
import { PageTitle, Stat } from '../../components/ui'

function dur(a, b) {
  if (!a) return '-'
  const m = Math.round(((b || Date.now()) - a) / 60000)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`
}

export default function TripsTab() {
  const trips = useCollection('trips', [orderBy('startedAt', 'desc'), limit(100)])
  const buses = useBuses()
  const busName = (id) => buses.data.find((b) => b.id === id)?.number || id

  const done = trips.data.filter((t) => t.endedAt)
  const totalKm = done.reduce((a, t) => a + (t.distance || 0), 0)

  return (
    <div className="space-y-5">
      <PageTitle title="Trips" sub="Every trip gets saved. Later this data can train a smarter ETA model." />
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Trips" value={trips.data.length} tone="lime" />
        <Stat label="Distance" value={fmtDist(totalKm)} tone="amber" />
        <Stat label="Running now" value={trips.data.length - done.length} tone="violet" />
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line bg-canvas text-left text-xs font-semibold text-muted">
              <th className="px-4 py-3">Bus</th><th className="px-4 py-3">Driver</th><th className="px-4 py-3">Started</th><th className="px-4 py-3">Duration</th><th className="px-4 py-3">Distance</th><th className="px-4 py-3">Updates</th>
            </tr>
          </thead>
          <tbody>
            {trips.data.map((t) => {
              const s = toMs(t.startedAt), e = toMs(t.endedAt)
              return (
                <tr key={t.id} className="border-b border-line font-medium last:border-0">
                  <td className="px-4 py-3 font-semibold">
                    <span className="flex items-center gap-2">{t.mode === 'sim' ? <Satellite className="h-3.5 w-3.5" /> : <MapPinned className="h-3.5 w-3.5" />}{busName(t.busId)}</span>
                  </td>
                  <td className="px-4 py-3">{t.driverName}</td>
                  <td className="px-4 py-3 text-muted">{s ? new Date(s).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '...'}</td>
                  <td className="px-4 py-3">{e ? dur(s, e) : <span className="chip bg-lime-soft text-lime-deep">● live · {dur(s)}</span>}</td>
                  <td className="px-4 py-3 font-mono text-xs">{e ? fmtDist(t.distance || 0) : '-'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{t.updates ?? '-'}</td>
                </tr>
              )
            })}
            {trips.data.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center font-semibold text-muted"><History className="mx-auto mb-2 h-6 w-6" />No trips yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
