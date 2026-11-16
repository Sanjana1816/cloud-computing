// sample city bus routes starting at Kashmere Gate, Delhi. loaded from the admin panel
import { doc, writeBatch, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

const P = (lat, lng) => ({ lat, lng })

const northOut = [
  P(28.6656, 77.2324), P(28.6668, 77.2302), P(28.6676, 77.2286), P(28.6700, 77.2274),
  P(28.6735, 77.2259), P(28.6768, 77.2249), P(28.6805, 77.2241), P(28.6845, 77.2230),
  P(28.6880, 77.2219), P(28.6905, 77.2198), P(28.6928, 77.2176), P(28.6950, 77.2149),
]

export const DEMO_ROUTES = [
  {
    id: 'route-101',
    name: 'Kashmere Gate to Vishwavidyalaya',
    code: '101',
    color: '#7C5CFF',
    path: [...northOut, ...northOut.slice(0, -1).reverse()],
    stops: [
      { id: 's1', name: 'Kashmere Gate Metro Station', ...P(28.6656, 77.2324) },
      { id: 's2', name: 'ISBT Kashmere Gate', ...P(28.6676, 77.2286) },
      { id: 's3', name: 'Civil Lines', ...P(28.6768, 77.2249) },
      { id: 's4', name: 'Vidhan Sabha Metro', ...P(28.6880, 77.2219) },
      { id: 's5', name: 'Vishwavidyalaya Metro Station', ...P(28.6950, 77.2149) },
    ],
  },
  {
    id: 'route-204',
    name: 'Kashmere Gate to Red Fort (loop)',
    code: '204',
    color: '#FF5FA2',
    path: [
      P(28.6656, 77.2324), P(28.6640, 77.2329), P(28.6622, 77.2330), P(28.6608, 77.2324),
      P(28.6592, 77.2314), P(28.6579, 77.2303), P(28.6570, 77.2328), P(28.6563, 77.2360),
      P(28.6561, 77.2392), P(28.6566, 77.2412), P(28.6590, 77.2402), P(28.6615, 77.2385),
      P(28.6638, 77.2360), P(28.6656, 77.2324),
    ],
    stops: [
      { id: 's1', name: 'Kashmere Gate Metro Station', ...P(28.6656, 77.2324) },
      { id: 's2', name: 'GPO Lothian Road', ...P(28.6608, 77.2324) },
      { id: 's3', name: 'Chandni Chowk', ...P(28.6579, 77.2303) },
      { id: 's4', name: 'Lal Quila (Red Fort)', ...P(28.6566, 77.2412) },
      { id: 's5', name: 'Salimgarh Bypass', ...P(28.6638, 77.2360) },
    ],
  },
]

export const DEMO_BUSES = [
  { id: 'bus-01', number: 'Bus 01', plate: 'DL 1PC 4521', routeId: 'route-101', capacity: 52 },
  { id: 'bus-02', number: 'Bus 02', plate: 'DL 1PC 7788', routeId: 'route-101', capacity: 52 },
  { id: 'bus-03', number: 'Bus 03', plate: 'DL 1PD 1203', routeId: 'route-204', capacity: 40 },
]

export async function seedDemoData() {
  const batch = writeBatch(db)
  DEMO_ROUTES.forEach(({ id, ...r }) => batch.set(doc(db, 'routes', id), { ...r, updatedAt: serverTimestamp() }))
  DEMO_BUSES.forEach(({ id, ...b }) => batch.set(doc(db, 'buses', id), { driverId: null, ...b, updatedAt: serverTimestamp() }, { merge: true }))
  await batch.commit()
}
