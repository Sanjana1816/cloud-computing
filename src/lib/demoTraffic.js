// admin-only demo mode: drives every idle bus along its route so the map looks like a normal day.
// runs in the admin's browser, writes one batch every 4 s, and stops by itself after 20 minutes
import { doc, writeBatch, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import { pathLength, pointAlong } from './geo'
import { DEMO_DRIVERS } from './seed'

const TICK_MS = 4000
const MAX_MS = 20 * 60 * 1000
const OCC = ['seats', 'standing', 'seats', 'full', 'seats', 'standing']

let timer = null
let stopAt = 0
let buses = {}
let uid = null
const listeners = new Set()

const status = () => ({ running: Boolean(timer), stopAt, count: Object.keys(buses).length })
const emit = () => listeners.forEach((fn) => fn(status()))

export function subscribeDemoTraffic(fn) {
  listeners.add(fn)
  fn(status())
  return () => listeners.delete(fn)
}

export function startDemoTraffic({ fleet, routes, user }) {
  if (timer) return
  const routeById = Object.fromEntries(routes.map((r) => [r.id, r]))
  buses = {}
  fleet.forEach((b, i) => {
    const route = routeById[b.routeId]
    if (!route || (route.path || []).length < 2) return
    if (b.live?.active && b.live.mode !== 'demo') return // a real driver is on it
    const total = pathLength(route.path)
    buses[b.id] = {
      route, total,
      d: total * ((i * 0.37 + 0.11) % 1), // spread buses out along the route
      v: (17 + ((i * 7) % 13)) / 3.6, // 17 to 29 km/h
      name: DEMO_DRIVERS.at(i % DEMO_DRIVERS.length),
      occ: OCC.at(i % OCC.length),
    }
  })
  uid = user.uid
  stopAt = Date.now() + MAX_MS
  tick()
  timer = setInterval(tick, TICK_MS)
  emit()
}

async function tick() {
  if (Date.now() > stopAt) return stopDemoTraffic()
  const batch = writeBatch(db)
  const now = Date.now()
  Object.entries(buses).forEach(([id, s]) => {
    const speed = s.v * (0.7 + Math.random() * 0.6) // traffic: speeds up and slows down
    s.d = (s.d + speed * TICK_MS / 1000) % s.total
    const p = pointAlong(s.route.path, s.d)
    batch.set(doc(db, 'live', id), {
      lat: p.lat, lng: p.lng, speed, heading: p.heading, accuracy: 6, occupancy: s.occ,
      active: true, mode: 'demo', busId: id, routeId: s.route.id, tripId: null,
      driverId: uid, driverName: s.name, clientTs: now, updatedAt: serverTimestamp(),
    })
  })
  try { await batch.commit() } catch (e) { console.error('demo traffic', e); stopDemoTraffic() }
}

export async function stopDemoTraffic() {
  if (!timer) return
  clearInterval(timer)
  timer = null
  const ids = Object.keys(buses)
  buses = {}
  emit()
  const batch = writeBatch(db)
  ids.forEach((id) => batch.update(doc(db, 'live', id), { active: false, speed: 0, clientTs: Date.now(), updatedAt: serverTimestamp() }))
  try { await batch.commit() } catch { /* already gone */ }
}

if (typeof window !== 'undefined') window.addEventListener('pagehide', () => { stopDemoTraffic() })
