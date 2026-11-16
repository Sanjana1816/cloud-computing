// Security-rule tests: run with `npm run test:rules` (starts the Firestore emulator).
import { readFileSync } from 'node:fs'
import { test, before, after, beforeEach } from 'node:test'
import {
  initializeTestEnvironment, assertSucceeds, assertFails,
} from '@firebase/rules-unit-testing'
import { doc, setDoc, getDoc, updateDoc, addDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore'

let env
const loc = (extra = {}) => ({ lat: 28.66, lng: 77.23, active: true, clientTs: Date.now(), updatedAt: serverTimestamp(), ...extra })

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-route-radar',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})
after(() => env.cleanup())

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'users/admin1'), { name: 'Admin', email: 'a@x.com', role: 'admin', approved: true, busId: null })
    await setDoc(doc(db, 'users/stu1'), { name: 'Stu', email: 's@x.com', role: 'passenger', approved: true, busId: null })
    await setDoc(doc(db, 'users/drv1'), { name: 'Drv', email: 'd@x.com', role: 'driver', approved: true, busId: 'bus-01' })
    await setDoc(doc(db, 'users/drv2'), { name: 'New', email: 'n@x.com', role: 'driver', approved: false, busId: null })
    await setDoc(doc(db, 'buses/bus-01'), { number: 'Bus 01', driverId: 'drv1' })
    await setDoc(doc(db, 'buses/bus-02'), { number: 'Bus 02', driverId: null })
  })
})

const as = (uid, email) => env.authenticatedContext(uid, { email }).firestore()
const anon = () => env.unauthenticatedContext().firestore()

test('signed-out visitors cannot read anything', async () => {
  await assertFails(getDoc(doc(anon(), 'buses/bus-01')))
  await assertFails(getDoc(doc(anon(), 'live/bus-01')))
})

test('sign-up: passenger and unverified driver allowed, self-admin blocked', async () => {
  await assertSucceeds(setDoc(doc(as('u1', 'u1@x.com'), 'users/u1'), { name: 'A', email: 'u1@x.com', role: 'passenger', approved: true, busId: null }))
  await assertSucceeds(setDoc(doc(as('u2', 'u2@x.com'), 'users/u2'), { name: 'B', email: 'u2@x.com', role: 'driver', approved: false, busId: null }))
  await assertFails(setDoc(doc(as('u3', 'u3@x.com'), 'users/u3'), { name: 'C', email: 'u3@x.com', role: 'admin', approved: true, busId: null }))
  await assertFails(setDoc(doc(as('u4', 'u4@x.com'), 'users/u4'), { name: 'D', email: 'u4@x.com', role: 'driver', approved: true, busId: null }))
  await assertFails(setDoc(doc(as('u5', 'u5@x.com'), 'users/u6'), { name: 'E', email: 'u5@x.com', role: 'passenger', approved: true, busId: null }))
})

test('users cannot promote themselves, but can save their stop', async () => {
  const db = as('stu1', 's@x.com')
  await assertFails(updateDoc(doc(db, 'users/stu1'), { role: 'admin' }))
  await assertFails(updateDoc(doc(as('drv2', 'n@x.com'), 'users/drv2'), { approved: true }))
  await assertSucceeds(updateDoc(doc(db, 'users/stu1'), { homeStop: 'route-north:s3' }))
})

test('passengers cannot read other users; admin can list everyone', async () => {
  await assertFails(getDoc(doc(as('stu1', 's@x.com'), 'users/drv1')))
  await assertFails(getDocs(collection(as('stu1', 's@x.com'), 'users')))
  await assertSucceeds(getDocs(collection(as('admin1', 'a@x.com'), 'users')))
})

test('only a VERIFIED driver can broadcast, and only for their own bus', async () => {
  await assertSucceeds(setDoc(doc(as('drv1', 'd@x.com'), 'live/bus-01'), loc({ driverId: 'drv1' })))
  await assertFails(setDoc(doc(as('drv1', 'd@x.com'), 'live/bus-02'), loc({ driverId: 'drv1' })))       // not their bus
  await assertFails(setDoc(doc(as('drv2', 'n@x.com'), 'live/bus-02'), loc({ driverId: 'drv2' })))       // not verified
  await assertFails(setDoc(doc(as('stu1', 's@x.com'), 'live/bus-01'), loc({ driverId: 'stu1' })))       // passenger
  await assertFails(setDoc(doc(as('drv1', 'd@x.com'), 'live/bus-01'), loc({ driverId: 'drv1', lat: 999 }))) // invalid data
})

test('passengers can read live locations and routes', async () => {
  await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'live/bus-01'), loc({ driverId: 'drv1' })))
  await assertSucceeds(getDoc(doc(as('stu1', 's@x.com'), 'live/bus-01')))
  await assertSucceeds(getDoc(doc(as('stu1', 's@x.com'), 'buses/bus-01')))
})

test('only admins manage fleet, routes and alerts', async () => {
  await assertFails(setDoc(doc(as('stu1', 's@x.com'), 'buses/bus-09'), { number: 'X' }))
  await assertFails(setDoc(doc(as('drv1', 'd@x.com'), 'routes/r9'), { name: 'X' }))
  await assertFails(addDoc(collection(as('drv1', 'd@x.com'), 'alerts'), { message: 'hi', severity: 'info', active: true }))
  await assertSucceeds(setDoc(doc(as('admin1', 'a@x.com'), 'buses/bus-09'), { number: 'X' }))
  await assertSucceeds(addDoc(collection(as('admin1', 'a@x.com'), 'alerts'), { message: 'Bus late', severity: 'warning', active: true }))
  await assertFails(addDoc(collection(as('admin1', 'a@x.com'), 'alerts'), { message: 'x'.repeat(201), severity: 'warning', active: true }))
})

test('trip logs: driver creates own trip, passengers cannot read them', async () => {
  const ref = await assertSucceeds(addDoc(collection(as('drv1', 'd@x.com'), 'trips'), { busId: 'bus-01', driverId: 'drv1', distance: 0 }))
  await assertFails(addDoc(collection(as('drv1', 'd@x.com'), 'trips'), { busId: 'bus-02', driverId: 'drv1' }))
  await assertFails(getDoc(doc(as('stu1', 's@x.com'), `trips/${ref.id}`)))
  await assertSucceeds(getDoc(doc(as('admin1', 'a@x.com'), `trips/${ref.id}`)))
})

test('presence: write own only; audit log is server-only', async () => {
  await assertSucceeds(setDoc(doc(as('stu1', 's@x.com'), 'presence/stu1'), { role: 'passenger' }))
  await assertFails(setDoc(doc(as('stu1', 's@x.com'), 'presence/drv1'), { role: 'driver' }))
  await assertFails(getDocs(collection(as('stu1', 's@x.com'), 'presence')))
  await assertFails(addDoc(collection(as('admin1', 'a@x.com'), 'auditLogs'), { x: 1 }))
})
