import { useState } from 'react'
import { doc, setDoc, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore'
import { Plus, Trash2, Bus } from 'lucide-react'
import { db } from '../../lib/firebase'
import { useCollection } from '../../lib/data'
import { useFleet } from '../StudentMap'
import { PageTitle, ErrorBox } from '../../components/ui'

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export default function FleetTab() {
  const { routes, fleet } = useFleet()
  const users = useCollection('users')
  const [form, setForm] = useState({ number: '', plate: '', routeId: '', capacity: 50 })
  const [err, setErr] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const nameOf = (uid) => users.data.find((u) => u.id === uid)?.name

  async function act(fn) { setErr(''); try { await fn() } catch (e) { setErr(e.code || e.message) } }

  const add = (e) => {
    e.preventDefault()
    const id = slug(form.number) || `bus-${Date.now()}`
    if (fleet.some((b) => b.id === id)) { setErr('There’s already a bus with that number.'); return }
    act(async () => {
      await setDoc(doc(db, 'buses', id), {
        number: form.number.trim(), plate: form.plate.trim().toUpperCase(), routeId: form.routeId || null,
        capacity: Number(form.capacity) || 50, driverId: null, updatedAt: serverTimestamp(),
      })
      setForm({ number: '', plate: '', routeId: '', capacity: 50 })
    })
  }

  const remove = (b) => {
    if (!confirm(`Delete ${b.number}?`)) return
    act(async () => {
      const batch = writeBatch(db)
      batch.delete(doc(db, 'buses', b.id))
      batch.delete(doc(db, 'live', b.id))
      if (b.driverId) batch.update(doc(db, 'users', b.driverId), { busId: null })
      await batch.commit()
    })
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Buses" sub="Add buses and put them on a route. Drivers get assigned from the People tab." />
      <ErrorBox>{err}</ErrorBox>

      <form onSubmit={add} className="card grid gap-3 bg-surface p-5 sm:grid-cols-2 lg:grid-cols-5">
        <div><label className="label">Bus number</label><input className="input" required placeholder="Bus 04" value={form.number} onChange={set('number')} /></div>
        <div><label className="label">Number plate</label><input className="input" required placeholder="DL 1PC 0000" value={form.plate} onChange={set('plate')} /></div>
        <div>
          <label className="label">Route</label>
          <select className="input" value={form.routeId} onChange={set('routeId')}>
            <option value="">none</option>
            {routes.map((r) => <option key={r.id} value={r.id}>{r.code} {r.name}</option>)}
          </select>
        </div>
        <div><label className="label">Seats</label><input className="input" type="number" min="1" max="120" value={form.capacity} onChange={set('capacity')} /></div>
        <div className="flex items-end"><button className="btn-primary w-full"><Plus className="h-4 w-4" />Add bus</button></div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {fleet.map((b) => {
          const route = routes.find((r) => r.id === b.routeId)
          return (
            <div key={b.id} className="card p-5 transition hover:shadow-lift">
              <div className="flex items-start gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-xl border border-line" style={{ background: route?.color || '#E7E5DE', color: route ? '#fff' : '#6E6C66' }}><Bus className="h-6 w-6" /></span>
                <div className="flex-1">
                  <div className="font-display text-lg font-extrabold">{b.number}</div>
                  <div className="font-mono text-xs text-muted">{b.plate} · {b.capacity} seats</div>
                </div>
                <span className={`chip ${b.live?.active ? 'bg-lime-soft text-lime-deep' : 'bg-canvas text-muted'}`}>{b.live?.active ? '● live' : 'idle'}</span>
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="label">Route</label>
                  <select className="input !py-2 text-xs" value={b.routeId || ''} onChange={(e) => act(() => updateDoc(doc(db, 'buses', b.id), { routeId: e.target.value || null }))}>
                    <option value="">none</option>
                    {routes.map((r) => <option key={r.id} value={r.id}>{r.code} {r.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-muted">Driver: <span className="text-ink">{nameOf(b.driverId) || 'nobody yet'}</span></span>
                  <button onClick={() => remove(b)} className="icon-btn !h-8 !w-8 hover:!bg-red-soft hover:!text-red" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          )
        })}
        {fleet.length === 0 && <p className="text-sm font-semibold text-muted">No buses yet. Add one above or load the sample data from the Dashboard.</p>}
      </div>
    </div>
  )
}
