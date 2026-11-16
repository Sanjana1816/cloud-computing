// sample data for demos: routes, buses, a week of trips and two alerts. loaded from the admin dashboard
import { collection, doc, writeBatch, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from './firebase'
import { pathLength } from './geo'
import { DEMO_ROUTES } from './demoRoutes'

export { DEMO_ROUTES }

export const DEMO_BUSES = [
  ['bus-01', 'Bus 01', 'DL 1PC 6347', 'route-101', 52], ['bus-02', 'Bus 02', 'DL 1PC 7788', 'route-101', 52],
  ['bus-03', 'Bus 03', 'DL 1PD 1203', 'route-204', 40], ['bus-04', 'Bus 04', 'DL 1PD 1257', 'route-204', 40],
  ['bus-05', 'Bus 05', 'DL 1PC 4521', 'route-181', 56], ['bus-06', 'Bus 06', 'DL 1PC 4598', 'route-181', 56],
  ['bus-07', 'Bus 07', 'DL 1PC 9012', 'route-534', 52], ['bus-08', 'Bus 08', 'DL 1PC 9046', 'route-534', 52],
  ['bus-09', 'Bus 09', 'DL 1PD 3310', 'route-405', 56], ['bus-10', 'Bus 10', 'DL 1PD 3384', 'route-405', 56],
  ['bus-11', 'Bus 11', 'DL 1PC 2275', 'route-966', 48], ['bus-12', 'Bus 12', 'DL 1PC 2219', 'route-966', 48],
].map(([id, number, plate, routeId, capacity]) => ({ id, number, plate, routeId, capacity }))

export const DEMO_DRIVERS = [
  'Ramesh Kumar', 'Suresh Yadav', 'Rajinder Singh', 'Anil Sharma', 'Vikram Rawat', 'Deepak Chauhan',
  'Sanjay Verma', 'Harpreet Singh', 'Mohd. Arif', 'Ravi Prakash', 'Manoj Negi', 'Imran Ali',
]

// small deterministic random so the sample data is the same every time
function rng(seed) {
  let s = seed
  return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296 }
}

function pastTrips(uid) {
  const rand = rng(42)
  const trips = []
  const now = Date.now()
  for (let day = 6; day >= 0; day--) {
    DEMO_BUSES.forEach((b, i) => {
      if (rand() < 0.45) return
      const route = DEMO_ROUTES.find((r) => r.id === b.routeId)
      const oneWay = pathLength(route.path) / 2
      const start = new Date(now - day * 864e5)
      start.setHours(6 + Math.floor(rand() * 14), Math.floor(rand() * 60), 0, 0)
      if (start.getTime() > now - 60 * 60e3) return // keep today's trips in the past
      const kmh = 14 + rand() * 10 // Delhi traffic
      const minutes = Math.round(oneWay / 1000 / kmh * 60)
      trips.push({
        busId: b.id, routeId: b.routeId, driverId: uid, driverName: DEMO_DRIVERS.at(i), mode: 'gps',
        startedAt: Timestamp.fromMillis(start.getTime()),
        endedAt: Timestamp.fromMillis(start.getTime() + minutes * 60e3),
        distance: Math.round(oneWay * (0.97 + rand() * 0.06)),
        updates: Math.round(minutes * 60 / 4.5),
        sample: true,
      })
    })
  }
  return trips
}

export async function seedDemoData({ uid, name }) {
  const batch = writeBatch(db)
  DEMO_ROUTES.forEach(({ id, ...r }) => batch.set(doc(db, 'routes', id), { ...r, updatedAt: serverTimestamp() }))
  DEMO_BUSES.forEach(({ id, ...b }) => batch.set(doc(db, 'buses', id), { driverId: null, ...b, updatedAt: serverTimestamp() }, { merge: true }))
  pastTrips(uid).forEach((t) => batch.set(doc(collection(db, 'trips')), t))
  const alerts = [
    ['warning', 'Route 181 buses are running 10 to 15 minutes late near ITO because of heavy traffic.', 'route-181'],
    ['info', 'Route 405 will not stop at Patel Chowk until 6 PM today because of road work.', 'route-405'],
  ]
  alerts.forEach(([severity, message, routeId]) => batch.set(doc(collection(db, 'alerts')), {
    message, severity, routeId, active: true, createdAt: serverTimestamp(), createdBy: uid, createdByName: name,
  }))
  await batch.commit()
}
