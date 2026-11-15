// distance / bearing / ETA maths

const R = 6371000 // earth radius in metres

export function haversine(a, b) {
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function bearing(a, b) {
  const toRad = (d) => (d * Math.PI) / 180
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat))
  const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng))
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

// length of a path in metres
export function pathLength(path) {
  let d = 0
  for (let i = 1; i < path.length; i++) d += haversine(path[i - 1], path[i])
  return d
}

// point `d` metres along the path
export function pointAlong(path, d) {
  for (let i = 1; i < path.length; i++) {
    const seg = haversine(path[i - 1], path[i])
    if (d <= seg || i === path.length - 1) {
      const t = seg === 0 ? 0 : Math.min(d / seg, 1)
      const a = path[i - 1], b = path[i]
      return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t, heading: bearing(a, b) }
    }
    d -= seg
  }
  return { ...path[0], heading: 0 }
}

// how far along the route point p is
export function progressOnPath(path, p) {
  let best = Infinity, bestProg = 0, acc = 0
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i]
    const seg = haversine(a, b)
    // project p onto the segment (flat approx is fine at city scale)
    const kx = Math.cos((a.lat * Math.PI) / 180)
    const ax = a.lng * kx, ay = a.lat, bx = b.lng * kx, by = b.lat, px = p.lng * kx, py = p.lat
    const dx = bx - ax, dy = by - ay
    const len2 = dx * dx + dy * dy
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
    const q = { lat: ay + dy * t, lng: (ax + dx * t) / kx }
    const dist = haversine(p, q)
    if (dist < best) { best = dist; bestProg = acc + seg * t }
    acc += seg
  }
  return bestProg
}

const AVG_SPEED = 22 / 3.6 // fallback 22 km/h in m/s (city bus average)

// ETA in seconds = distance along route / (mix of live speed and avg city speed)
export function etaSeconds(route, live, stop) {
  if (!route?.path?.length || !live || !stop) return null
  const total = pathLength(route.path)
  const busProg = progressOnPath(route.path, live)
  let stopProg = progressOnPath(route.path, stop)
  if (stopProg < busProg - 30) stopProg += total // stop already passed: next loop
  const dist = Math.max(0, stopProg - busProg)
  const v = live.speed > 1 ? 0.6 * live.speed + 0.4 * AVG_SPEED : AVG_SPEED
  return { seconds: dist / v, metres: dist }
}

export function fmtEta(s) {
  if (s == null) return '-'
  if (s < 45) return 'Arriving'
  const m = Math.round(s / 60)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`
}

export function fmtDist(m) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`
}
