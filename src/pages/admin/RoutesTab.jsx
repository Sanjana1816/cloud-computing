import { useState } from 'react'
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { Plus, Trash2, Undo2, MapPin, Spline, Save, X, Pencil, Repeat } from 'lucide-react'
import { db } from '../../lib/firebase'
import { useRoutes, useBuses } from '../../lib/data'
import LiveMap from '../../components/LiveMap'
import { PageTitle, ErrorBox } from '../../components/ui'
import { pathLength, fmtDist } from '../../lib/geo'

const COLORS = ['#3D6BFF', '#FF7EC7', '#C6F45D', '#FFD43B', '#FF8A3D', '#BBA6FF', '#6EE7B7']
const empty = () => ({ id: null, name: '', code: '', color: COLORS[0], path: [], stops: [] })
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : w.endsWith('s') ? 'es' : 's'}`

export default function RoutesTab() {
  const routes = useRoutes()
  const buses = useBuses()
  const [draft, setDraft] = useState(null)
  const [tool, setTool] = useState('path')
  const [err, setErr] = useState('')

  function onMapClick(pt) {
    if (!draft) return
    const p = { lat: +pt.lat.toFixed(6), lng: +pt.lng.toFixed(6) }
    if (tool === 'path') setDraft((d) => ({ ...d, path: [...d.path, p] }))
    else {
      const name = prompt('Stop name?')
      if (name) setDraft((d) => ({ ...d, stops: [...d.stops, { id: `s${Date.now().toString(36)}`, name, ...p }] }))
    }
  }

  async function save() {
    setErr('')
    if (!draft.name.trim()) return setErr('Give the route a name.')
    if (draft.path.length < 2) return setErr('Click at least 2 points on the map to draw the route.')
    const id = draft.id || `route-${Date.now().toString(36)}`
    try {
      await setDoc(doc(db, 'routes', id), {
        name: draft.name.trim(), code: draft.code.trim() || 'R', color: draft.color,
        path: draft.path, stops: draft.stops, updatedAt: serverTimestamp(),
      })
      setDraft(null)
    } catch (e) { setErr(e.code || e.message) }
  }

  async function remove(r) {
    const used = buses.data.filter((b) => b.routeId === r.id).length
    if (!confirm(`Delete ${r.name}?${used ? ` ${plural(used, 'bus')} still use it.` : ''}`)) return
    try { await deleteDoc(doc(db, 'routes', r.id)) } catch (e) { setErr(e.code || e.message) }
  }

  const shown = draft
    ? [...routes.data.filter((r) => r.id !== draft.id).map((r) => ({ ...r, color: '#cfcac0' })), { ...draft, id: 'draft', draft: true }]
    : routes.data

  return (
    <div className="space-y-5">
      <PageTitle title="Routes" sub="Click on the map to draw a route, then drop stops on it. Everyone’s map updates as soon as you save.">
        {!draft && <button className="btn-primary" onClick={() => { setDraft(empty()); setTool('path') }}><Plus className="h-4 w-4" />New route</button>}
      </PageTitle>
      <ErrorBox>{err}</ErrorBox>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className={`card relative h-[520px] overflow-hidden ${draft ? 'cursor-crosshair' : ''}`}>
          <LiveMap routes={shown} onMapClick={draft ? onMapClick : undefined} />
          {draft && (
            <div className="absolute left-1/2 top-3 z-[500] flex -translate-x-1/2 gap-1 rounded-xl border-2 border-ink bg-cream p-1 shadow-hard-sm">
              <button onClick={() => setTool('path')} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold ${tool === 'path' ? 'bg-cobalt text-white' : ''}`}><Spline className="h-3.5 w-3.5" />Draw path</button>
              <button onClick={() => setTool('stop')} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-extrabold ${tool === 'stop' ? 'bg-pink' : ''}`}><MapPin className="h-3.5 w-3.5" />Add stop</button>
            </div>
          )}
        </div>

        {draft ? (
          <div className="card space-y-4 p-5">
            <h2 className="text-xl font-extrabold">{draft.id ? 'Edit route' : 'New route'}</h2>
            <div className="grid grid-cols-[80px_1fr] gap-3">
              <div><label className="label">Code</label><input className="input" placeholder="R3" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} /></div>
              <div><label className="label">Name</label><input className="input" placeholder="Campus to Metro" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
            </div>
            <div>
              <label className="label">Colour</label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button key={c} onClick={() => setDraft({ ...draft, color: c })}
                    className={`h-8 w-8 rounded-lg border-2 border-ink transition ${draft.color === c ? 'shadow-hard-sm -translate-y-0.5' : ''}`} style={{ background: c }} />
                ))}
              </div>
            </div>
            <div className="rounded-xl border-2 border-ink bg-paper p-3 text-xs font-semibold">
              {draft.path.length} points · {fmtDist(pathLength(draft.path))} · {plural(draft.stops.length, 'stop')}
              <div className="mt-2 flex gap-2">
                <button className="btn-ghost !px-2.5 !py-1 text-xs" disabled={!draft.path.length} onClick={() => setDraft({ ...draft, path: draft.path.slice(0, -1) })}><Undo2 className="h-3 w-3" />Undo</button>
                <button className="btn-ghost !px-2.5 !py-1 text-xs" disabled={draft.path.length < 2} onClick={() => setDraft({ ...draft, path: [...draft.path, draft.path[0]] })}><Repeat className="h-3 w-3" />Close loop</button>
              </div>
            </div>
            <div className="max-h-48 space-y-1.5 overflow-y-auto">
              {draft.stops.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2 rounded-lg border-2 border-ink bg-cream px-3 py-1.5 text-sm font-semibold">
                  <span className="grid h-5 w-5 place-items-center rounded-full border-2 border-ink bg-pink text-[10px] font-extrabold">{i + 1}</span>
                  <span className="flex-1">{s.name}</span>
                  <button onClick={() => setDraft({ ...draft, stops: draft.stops.filter((x) => x.id !== s.id) })} className="hover:text-coral"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button className="btn-ghost flex-1" onClick={() => setDraft(null)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={save}><Save className="h-4 w-4" />Save</button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {routes.data.map((r) => (
              <div key={r.id} className="card flex items-center gap-3 p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-ink font-mono text-xs font-bold" style={{ background: r.color, color: r.color === '#3D6BFF' ? '#fff' : '#141414' }}>{r.code}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-extrabold">{r.name}</div>
                  <div className="text-xs font-medium text-ink/55">{plural((r.stops || []).length, 'stop')} · {fmtDist(pathLength(r.path || []))} · {plural(buses.data.filter((b) => b.routeId === r.id).length, 'bus')}</div>
                </div>
                <button className="rounded-lg border-2 border-ink bg-cream p-1.5 hover:shadow-hard-sm" title="Edit" onClick={() => { setDraft({ ...empty(), ...r }); setTool('path') }}><Pencil className="h-3.5 w-3.5" /></button>
                <button className="rounded-lg border-2 border-ink bg-coral p-1.5 hover:shadow-hard-sm" title="Delete" onClick={() => remove(r)}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            {routes.data.length === 0 && <p className="text-sm font-semibold text-ink/50">No routes yet.</p>}
          </div>
        )}
      </div>
    </div>
  )
}
