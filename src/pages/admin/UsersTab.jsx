import { useState } from 'react'
import { doc, writeBatch, orderBy, limit } from 'firebase/firestore'
import { BadgeCheck, ShieldOff, Search, ShieldAlert, ScrollText } from 'lucide-react'
import { db } from '../../lib/firebase'
import { useCollection, useBuses, toMs } from '../../lib/data'
import { RoleChip, PageTitle, ErrorBox } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { ago } from '../PassengerMap'

export default function UsersTab() {
  const { user: me } = useAuth()
  const users = useCollection('users')
  const buses = useBuses()
  const audit = useCollection('auditLogs', [orderBy('at', 'desc'), limit(8)])
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [err, setErr] = useState('')

  const isPending = (u) => u.role === 'driver' && !u.approved
  const pending = users.data.filter(isPending)
  const list = users.data
    .filter((u) => filter === 'all' || (filter === 'pending' ? isPending(u) : u.role === filter))
    .filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (isPending(a) ? -1 : 0) - (isPending(b) ? -1 : 0) || a.name.localeCompare(b.name))

  async function act(fn) {
    setErr('')
    try { await fn() } catch (e) { setErr(e.code || e.message) }
  }

  const setApproved = (u, approved) => act(async () => {
    const batch = writeBatch(db)
    batch.update(doc(db, 'users', u.id), { approved, ...(approved ? {} : { busId: null }) })
    if (!approved && u.busId) batch.update(doc(db, 'buses', u.busId), { driverId: null })
    await batch.commit()
  })

  const setRole = (u, role) => act(async () => {
    const batch = writeBatch(db)
    batch.update(doc(db, 'users', u.id), { role, approved: role !== 'driver' ? true : u.approved, ...(role !== 'driver' ? { busId: null } : {}) })
    if (role !== 'driver' && u.busId) batch.update(doc(db, 'buses', u.busId), { driverId: null })
    await batch.commit()
  })

  // keep user.busId and bus.driverId in sync in one batch
  const assignBus = (u, busId) => act(async () => {
    const batch = writeBatch(db)
    if (u.busId) batch.update(doc(db, 'buses', u.busId), { driverId: null })
    if (busId) {
      const bus = buses.data.find((b) => b.id === busId)
      if (bus?.driverId && bus.driverId !== u.id) batch.update(doc(db, 'users', bus.driverId), { busId: null })
      batch.update(doc(db, 'buses', busId), { driverId: u.id })
    }
    batch.update(doc(db, 'users', u.id), { busId: busId || null })
    await batch.commit()
  })

  return (
    <div className="space-y-5">
      <PageTitle title="People" sub="Verify drivers, hand out buses and change roles. The database rules double-check every change." />

      {pending.length > 0 && (
        <div className="flex animate-pop items-center gap-3 rounded-2xl bg-amber-soft px-4 py-3 text-sm font-semibold text-amber-deep">
          <ShieldAlert className="h-5 w-5" />
          {pending.length} driver{pending.length > 1 ? 's are' : ' is'} waiting for you to verify them.
        </div>
      )}
      <ErrorBox>{err}</ErrorBox>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="input pl-10" placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex gap-1 rounded-xl border border-line bg-surface p-1">
          {['all', 'pending', 'passenger', 'driver', 'admin'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${filter === f ? 'bg-ink text-white' : 'hover:bg-canvas'}`}>{f}</button>
          ))}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-line bg-canvas text-left text-xs font-semibold text-muted">
              <th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Bus</th><th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id} className={`border-b border-line last:border-0 ${isPending(u) ? 'bg-amber-soft/40' : ''}`}>
                <td className="px-4 py-3">
                  <div className="font-semibold">{u.name}{u.id === me.uid && <span className="ml-2 text-xs font-semibold text-muted">(you)</span>}</div>
                  <div className="text-xs font-medium text-muted">{u.email}</div>
                </td>
                <td className="px-4 py-3">
                  {u.id === me.uid ? <RoleChip role={u.role} /> : (
                    <select className="input !w-auto !py-1.5 text-xs" value={u.role} onChange={(e) => setRole(u, e.target.value)}>
                      <option value="passenger">passenger</option><option value="driver">driver</option><option value="admin">admin</option>
                    </select>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.role !== 'driver' ? <span className="text-muted">-</span>
                    : u.approved ? <span className="chip bg-lime-soft text-lime-deep"><BadgeCheck className="h-3 w-3" />verified</span>
                      : <span className="chip bg-amber-soft text-amber-deep">pending</span>}
                </td>
                <td className="px-4 py-3">
                  {u.role === 'driver' && u.approved ? (
                    <select className="input !w-auto !py-1.5 text-xs" value={u.busId || ''} onChange={(e) => assignBus(u, e.target.value)}>
                      <option value="">none</option>
                      {buses.data.map((b) => (
                        <option key={b.id} value={b.id}>{b.number}{b.driverId && b.driverId !== u.id ? ' (taken)' : ''}</option>
                      ))}
                    </select>
                  ) : <span className="text-muted">-</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  {u.role === 'driver' && (u.approved
                    ? <button onClick={() => setApproved(u, false)} className="btn-ghost !px-3 !py-1.5 text-xs"><ShieldOff className="h-3.5 w-3.5" />Revoke</button>
                    : <button onClick={() => setApproved(u, true)} className="btn-primary !px-3 !py-1.5 text-xs"><BadgeCheck className="h-3.5 w-3.5" />Verify</button>)}
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center font-semibold text-muted">Nobody matches that.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card p-5">
        <h2 className="flex items-center gap-2 text-lg font-bold"><ScrollText className="h-5 w-5" />Audit log</h2>
        <p className="mt-1 text-xs font-medium text-muted">A Cloud Function writes here whenever a role, verification or bus changes. Nobody can edit it from the app.</p>
        <div className="mt-3 space-y-1.5">
          {audit.data.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-x-3 rounded-lg border border-line bg-canvas px-3 py-2 text-xs font-medium">
              <span className="font-semibold">{a.name}</span>
              {a.changes.map((c) => <span key={c.field}><span className="text-muted">{c.field}:</span> {String(c.from)} → <b>{String(c.to)}</b></span>)}
              <span className="ml-auto text-muted">{ago(toMs(a.at))}</span>
            </div>
          ))}
          {audit.data.length === 0 && <p className="text-xs font-medium text-muted">Nothing yet. This fills up once the Cloud Functions are deployed.</p>}
        </div>
      </div>
    </div>
  )
}
