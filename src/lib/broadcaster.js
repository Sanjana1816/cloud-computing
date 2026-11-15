// driver side: GPS (or simulator) -> clean up on the phone -> send to firestore (throttled)
import { useCallback, useEffect, useRef, useState } from 'react'
import { addDoc, collection, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import { haversine, bearing, pathLength, pointAlong, progressOnPath } from './geo'

const MIN_INTERVAL_MS = 2000   // never write more often than this (protects quota & cost)
const HEARTBEAT_MS = 10000     // write at least this often even when parked
const MIN_MOVE_M = 8           // ignore jitter smaller than this
const MAX_ACCURACY_M = 80      // reject poor GPS fixes
const MAX_SPEED_MS = 120 / 3.6 // reject teleport jumps (> 120 km/h)
const SIM_SPEED_MS = 32 / 3.6  // demo simulator speed
const SIM_TICK_MS = 2000

export function useTripBroadcaster({ bus, route, user, profile }) {
  const [state, setState] = useState({
    running: false, mode: null, tripId: null, startedAt: null, distance: 0,
    sent: 0, filtered: 0, lastFix: null, error: null, occupancy: 'seats',
  })
  const s = useRef({})              // mutable pipeline state
  const occRef = useRef('seats')
  const stopFns = useRef([])

  const write = useCallback(async (fix, force = false) => {
    const p = s.current
    const now = Date.now()
    const prev = p.lastSent
    // filter on the phone first
    if (fix.accuracy && fix.accuracy > MAX_ACCURACY_M) { p.filtered++; return sync() }
    if (prev) {
      const d = haversine(prev, fix)
      const dt = (now - prev.t) / 1000
      if (dt > 0 && d / dt > MAX_SPEED_MS) { p.filtered++; return sync() }
      const due = now - prev.t >= HEARTBEAT_MS
      if (!force && (now - prev.t < MIN_INTERVAL_MS || (d < MIN_MOVE_M && !due))) { p.filtered++; return sync() }
      // speed + heading worked out on the phone
      const rawSpeed = fix.speed ?? (dt > 0 ? d / dt : 0)
      p.speed = p.speed == null ? rawSpeed : 0.5 * p.speed + 0.5 * rawSpeed
      if (d >= MIN_MOVE_M) p.heading = fix.heading ?? bearing(prev, fix)
      p.distance += d
    }
    const payload = {
      lat: fix.lat, lng: fix.lng,
      speed: Math.max(0, p.speed || 0), heading: p.heading || 0,
      accuracy: Math.round(fix.accuracy || 0),
      occupancy: occRef.current,
      active: true, mode: p.mode,
      busId: bus.id, routeId: bus.routeId || null, tripId: p.tripId,
      driverId: user.uid, driverName: profile.name,
      clientTs: now, updatedAt: serverTimestamp(),
    }
    p.lastSent = { lat: fix.lat, lng: fix.lng, t: now }
    p.sent++
    sync(fix)
    try { await setDoc(doc(db, 'live', bus.id), payload) } catch (e) { setState((st) => ({ ...st, error: e.code || e.message })) }

    function sync(f) {
      setState((st) => ({ ...st, sent: p.sent, filtered: p.filtered, distance: p.distance, lastFix: f || st.lastFix }))
    }
  }, [bus?.id, bus?.routeId, user?.uid, profile?.name])

  const start = useCallback(async (mode, resumeFrom = null) => {
    if (!bus) return
    setState((st) => ({ ...st, error: null }))
    let tripId = null
    try {
      const ref = await addDoc(collection(db, 'trips'), {
        busId: bus.id, routeId: bus.routeId || null, driverId: user.uid, driverName: profile.name,
        mode, startedAt: serverTimestamp(), endedAt: null, distance: 0, updates: 0,
      })
      tripId = ref.id
    } catch (e) {
      setState((st) => ({ ...st, error: e.code || e.message }))
      return
    }
    s.current = { tripId, mode, resumeFrom, sent: 0, filtered: 0, distance: 0, lastSent: null, speed: null, heading: 0 }
    setState((st) => ({ ...st, running: true, mode, tripId, startedAt: Date.now(), sent: 0, filtered: 0, distance: 0, lastFix: null }))

    // keep screen on while driving
    try {
      const lock = await navigator.wakeLock?.request('screen')
      if (lock) stopFns.current.push(() => lock.release())
    } catch { /* not supported */ }

    if (mode === 'gps') {
      if (!('geolocation' in navigator)) { setState((st) => ({ ...st, error: 'This device has no GPS / geolocation.' })); return }
      const id = navigator.geolocation.watchPosition(
        (pos) => write({
          lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy,
          speed: pos.coords.speed ?? undefined, heading: Number.isFinite(pos.coords.heading) ? pos.coords.heading : undefined,
        }),
        (err) => setState((st) => ({ ...st, error: err.code === 1 ? 'Location permission denied. Allow location for this site.' : err.message })),
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 },
      )
      stopFns.current.push(() => navigator.geolocation.clearWatch(id))
    } else {
      // demo mode: fake GPS that drives along the route
      const path = route?.path || []
      if (path.length < 2) { setState((st) => ({ ...st, error: 'This bus has no route path to simulate.' })); return }
      const total = pathLength(path)
      let dist = 0
      const tick = () => {
        const p = pointAlong(path, dist % total)
        write({ lat: p.lat, lng: p.lng, accuracy: 5, speed: SIM_SPEED_MS * (0.85 + Math.random() * 0.3), heading: p.heading }, true)
        dist += SIM_SPEED_MS * (SIM_TICK_MS / 1000)
      }
      if (s.current.resumeFrom) dist = progressOnPath(path, s.current.resumeFrom)
      tick()
      const id = setInterval(tick, SIM_TICK_MS)
      stopFns.current.push(() => clearInterval(id))
    }
  }, [bus, route, user, profile, write])

  const stop = useCallback(async () => {
    stopFns.current.forEach((f) => f())
    stopFns.current = []
    const p = s.current
    setState((st) => ({ ...st, running: false }))
    if (!bus) return
    try {
      await updateDoc(doc(db, 'live', bus.id), { active: false, speed: 0, updatedAt: serverTimestamp(), clientTs: Date.now() })
      if (p.tripId) await updateDoc(doc(db, 'trips', p.tripId), { endedAt: serverTimestamp(), distance: Math.round(p.distance), updates: p.sent })
    } catch (e) { setState((st) => ({ ...st, error: e.code || e.message })) }
  }, [bus])

  const setOccupancy = useCallback(async (o) => {
    occRef.current = o
    setState((st) => ({ ...st, occupancy: o }))
    if (bus && s.current.lastSent) {
      try { await updateDoc(doc(db, 'live', bus.id), { occupancy: o, updatedAt: serverTimestamp(), clientTs: Date.now() }) } catch { /* ignore */ }
    }
  }, [bus])

  // stop GPS if the page closes; students see "signal lost" after 60s
  useEffect(() => () => stopFns.current.forEach((f) => f()), [])

  return { ...state, start, stop, setOccupancy }
}
