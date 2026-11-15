// realtime hooks (onSnapshot) used by every screen
import { useEffect, useState } from 'react'
import {
  collection, doc, onSnapshot, query, where, orderBy, limit,
} from 'firebase/firestore'
import { db } from './firebase'

export function useCollection(path, constraints = [], deps = [], enabled = true) {
  const [state, setState] = useState({ data: [], loading: true, error: null })
  useEffect(() => {
    if (!enabled) { setState({ data: [], loading: false, error: null }); return }
    const q = constraints.length ? query(collection(db, path), ...constraints) : collection(db, path)
    return onSnapshot(
      q,
      (snap) => setState({ data: snap.docs.map((d) => ({ id: d.id, ...d.data() })), loading: false, error: null }),
      (error) => { console.error(path, error); setState({ data: [], loading: false, error }) },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, enabled, ...deps])
  return state
}

export function useDocument(path, id) {
  const [state, setState] = useState({ data: null, loading: true })
  useEffect(() => {
    if (!id) { setState({ data: null, loading: false }); return }
    return onSnapshot(
      doc(db, path, id),
      (s) => setState({ data: s.exists() ? { id: s.id, ...s.data() } : null, loading: false }),
      (error) => { console.error(path, error); setState({ data: null, loading: false }) },
    )
  }, [path, id])
  return state
}

export const useRoutes = () => useCollection('routes')
export const useBuses = () => useCollection('buses')
export const useLive = () => useCollection('live')
export const useActiveAlerts = () =>
  useCollection('alerts', [where('active', '==', true), orderBy('createdAt', 'desc'), limit(5)])

export function toMs(ts) {
  if (!ts) return null
  if (typeof ts === 'number') return ts
  if (ts.toMillis) return ts.toMillis()
  return null
}

// re-render every `ms` so "3s ago" labels update
export function useTicker(ms = 1000) {
  const [, set] = useState(0)
  useEffect(() => { const t = setInterval(() => set((n) => n + 1), ms); return () => clearInterval(t) }, [ms])
}
