import { useState } from 'react'
import { addDoc, collection, doc, updateDoc, orderBy, limit, serverTimestamp } from 'firebase/firestore'
import { Megaphone, Send, AlertTriangle, Info, OctagonAlert, Check } from 'lucide-react'
import { db } from '../../lib/firebase'
import { useCollection, useRoutes, toMs } from '../../lib/data'
import { useAuth } from '../../context/AuthContext'
import { PageTitle, ErrorBox } from '../../components/ui'
import { ago } from '../StudentMap'

const SEV = {
  info: { icon: Info, cls: 'bg-violet-soft text-violet-deep', label: 'Info' },
  warning: { icon: AlertTriangle, cls: 'bg-amber-soft text-amber-deep', label: 'Delay' },
  critical: { icon: OctagonAlert, cls: 'bg-red-soft text-red', label: 'Urgent' },
}
const QUICK = [
  ['warning', 'Bus 02 is running 15 minutes late because of traffic near ISBT.'],
  ['critical', 'Bus 03 broke down. A replacement bus is on the way.'],
  ['info', 'Tomorrow the first bus leaves at 7:30 AM instead of 8:00.'],
]

export default function AlertsTab() {
  const { user, profile } = useAuth()
  const routes = useRoutes()
  const alerts = useCollection('alerts', [orderBy('createdAt', 'desc'), limit(30)])
  const [form, setForm] = useState({ message: '', severity: 'warning', routeId: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function send(e) {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      await addDoc(collection(db, 'alerts'), {
        message: form.message.trim(), severity: form.severity, routeId: form.routeId || null,
        active: true, createdAt: serverTimestamp(), createdBy: user.uid, createdByName: profile.name,
      })
      setForm((f) => ({ ...f, message: '' }))
    } catch (e2) { setErr(e2.code || e2.message) } finally { setBusy(false) }
  }

  const resolve = (a) => updateDoc(doc(db, 'alerts', a.id), { active: false }).catch((e) => setErr(e.code || e.message))

  return (
    <div className="space-y-5">
      <PageTitle title="Alerts" sub="Whatever you send here pops up on every student’s screen at the same time. Try it with two phones side by side." />
      <ErrorBox>{err}</ErrorBox>

      <form onSubmit={send} className="card space-y-4 p-5">
        <div className="flex flex-wrap gap-2">
          {Object.entries(SEV).map(([k, { icon: I, cls, label }]) => (
            <button type="button" key={k} onClick={() => setForm({ ...form, severity: k })}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${form.severity === k ? cls : 'bg-canvas text-muted hover:text-ink'}`}><I className="h-3.5 w-3.5" />{label}</button>
          ))}
          <select className="input ml-auto !w-auto !py-1.5 text-xs" value={form.routeId} onChange={(e) => setForm({ ...form, routeId: e.target.value })}>
            <option value="">All routes</option>
            {routes.data.map((r) => <option key={r.id} value={r.id}>{r.code} {r.name}</option>)}
          </select>
        </div>
        <textarea className="input min-h-[96px]" required maxLength={200} placeholder="What do students need to know?" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Quick fill:</span>
          {QUICK.map(([sev, msg]) => (
            <button type="button" key={msg} onClick={() => setForm({ ...form, severity: sev, message: msg })} className="rounded-full bg-canvas px-3 py-1 text-xs text-muted hover:text-ink">{msg.slice(0, 26)}...</button>
          ))}
          <button disabled={busy} className="btn-primary ml-auto"><Send className="h-4 w-4" />Send to everyone</button>
        </div>
      </form>

      <div className="space-y-2.5">
        {alerts.data.map((a) => {
          const S = SEV[a.severity] || SEV.info
          return (
            <div key={a.id} className={`card flex items-start gap-3 p-4 ${a.active ? '' : 'opacity-55'}`}>
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${S.cls}`}><S.icon className="h-4 w-4" /></span>
              <div className="flex-1">
                <div className="pt-0.5 text-sm font-semibold">{a.message}</div>
                <div className="mt-1 text-xs text-muted">{a.routeId ? routes.data.find((r) => r.id === a.routeId)?.name : 'All routes'} · {a.createdByName} · {ago(toMs(a.createdAt))}</div>
              </div>
              {a.active ? <button onClick={() => resolve(a)} className="btn-ghost btn-sm"><Check className="h-3.5 w-3.5" />Resolve</button> : <span className="text-xs text-muted">Resolved</span>}
            </div>
          )
        })}
        {alerts.data.length === 0 && <p className="flex items-center gap-2 text-sm font-semibold text-muted"><Megaphone className="h-4 w-4" />No alerts sent yet.</p>}
      </div>
    </div>
  )
}
