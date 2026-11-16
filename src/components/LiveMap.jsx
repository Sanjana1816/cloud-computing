import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const CITY_CENTER = [28.6656, 77.2324]

// cache icons so re-renders don't rebuild the DOM (that would restart the pulse)
const iconCache = new Map()
function cached(key, make) {
  if (!iconCache.has(key)) iconCache.set(key, make())
  return iconCache.get(key)
}

function busIcon({ label, color, heading = 0, active, selected }) {
  const h = Math.round(heading / 5) * 5
  const fill = active ? color : '#B9B7B0'
  const size = selected ? 42 : 36
  return cached(`bus|${label}|${color}|${h}|${active}|${selected}`, () => L.divIcon({
    className: '',
    iconSize: [56, 56],
    iconAnchor: [28, 28],
    html: `
      <div style="position:relative;width:56px;height:56px;display:grid;place-items:center">
        ${active ? `<span class="animate-pulsering" style="position:absolute;width:36px;height:36px;border-radius:999px;background:${color}"></span>` : ''}
        ${active ? `<div style="position:absolute;inset:0;transform:rotate(${h}deg)">
          <div style="position:absolute;left:50%;top:${selected ? 3 : 6}px;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:8px solid ${color}"></div>
        </div>` : ''}
        <div style="position:relative;width:${size}px;height:${size}px;border-radius:999px;background:${fill};border:3px solid #fff;
          box-shadow:0 6px 16px -4px rgba(17,17,17,.35)${selected ? ',0 0 0 3px #111' : ''};
          display:grid;place-items:center;color:#fff;font:800 13px 'Bricolage Grotesque',sans-serif">${label}</div>
      </div>`,
  }))
}

function stopIcon(color, highlighted) {
  return cached(`stop|${color}|${highlighted}`, () => L.divIcon({
    className: '',
    iconSize: highlighted ? [26, 26] : [14, 14],
    iconAnchor: highlighted ? [13, 13] : [7, 7],
    html: highlighted
      ? `<div style="width:26px;height:26px;border-radius:999px;background:#111;border:3px solid #fff;box-shadow:0 4px 12px -2px rgba(0,0,0,.4);display:grid;place-items:center"><div style="width:9px;height:9px;border-radius:999px;background:#D4F65C"></div></div>`
      : `<div style="width:14px;height:14px;border-radius:999px;background:#fff;border:3px solid ${color};box-shadow:0 1px 3px rgba(0,0,0,.25)"></div>`,
  }))
}

// glides between GPS points instead of teleporting
function AnimatedMarker({ position, icon, children, onClick }) {
  const ref = useRef(null)
  const last = useRef(position)
  useEffect(() => {
    const m = ref.current
    if (!m) return
    const from = last.current, to = position
    const start = performance.now(), dur = 1500
    let raf
    const step = (t) => {
      const k = Math.min((t - start) / dur, 1)
      const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2
      m.setLatLng([from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e])
      if (k < 1) raf = requestAnimationFrame(step)
      else last.current = to
    }
    raf = requestAnimationFrame(step)
    return () => { cancelAnimationFrame(raf); const c = m.getLatLng(); last.current = [c.lat, c.lng] }
  }, [position[0], position[1]])
  return (
    <Marker ref={ref} position={last.current} icon={icon} zIndexOffset={1000} eventHandlers={onClick ? { click: onClick } : undefined}>
      {children}
    </Marker>
  )
}

function FlyTo({ target }) {
  const map = useMap()
  useEffect(() => { if (target) map.flyTo(target, Math.max(map.getZoom(), 15), { duration: 0.8 }) }, [target?.[0], target?.[1]])
  return null
}

function ClickCapture({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick?.({ lat: e.latlng.lat, lng: e.latlng.lng }) })
  return null
}

function FitRoutes({ routes, padding }) {
  const map = useMap()
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    const pts = routes.flatMap((r) => (r.path || []).map((p) => [p.lat, p.lng]))
    if (pts.length > 1) {
      map.fitBounds(pts, { paddingTopLeft: padding?.[0] || [40, 40], paddingBottomRight: padding?.[1] || [40, 40] })
      done.current = true
    }
  }, [routes, map])
  return null
}

// light route colours (lime, amber...) get a dark bus marker so the white number stays readable
export function isLight(hex = '#111111') {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return 0.299 * r + 0.587 * g + 0.114 * b > 170
}

// shared map for passenger / driver / admin / landing
export default function LiveMap({
  routes = [], buses = [], selectedBusId, onSelectBus, highlightStopId, onStopClick,
  flyTo, onMapClick, draftPath, fitPadding, interactive = true, zoomControl = true, className = '',
}) {
  const routeById = useMemo(() => Object.fromEntries(routes.map((r) => [r.id, r])), [routes])
  return (
    <MapContainer center={CITY_CENTER} zoom={14} zoomControl={false} scrollWheelZoom={interactive} dragging={interactive}
      doubleClickZoom={interactive} touchZoom={interactive} className={`h-full w-full ${className}`}>
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      {interactive && zoomControl && <ZoomControl position="bottomright" />}
      <FitRoutes routes={routes} padding={fitPadding} />
      <FlyTo target={flyTo} />
      {onMapClick && <ClickCapture onMapClick={onMapClick} />}

      {routes.map((r) => (
        <Polyline key={r.id + '-casing'} positions={(r.path || []).map((p) => [p.lat, p.lng])}
          pathOptions={{ color: '#ffffff', weight: 10, opacity: 0.95, lineJoin: 'round', lineCap: 'round' }} />
      ))}
      {routes.map((r) => (
        <Polyline key={r.id} positions={(r.path || []).map((p) => [p.lat, p.lng])}
          pathOptions={{ color: r.color, weight: 5, opacity: 1, lineJoin: 'round', lineCap: 'round', dashArray: r.draft ? '1 10' : undefined }} />
      ))}
      {draftPath?.length > 0 && (
        <Polyline positions={draftPath.map((p) => [p.lat, p.lng])} pathOptions={{ color: '#111', weight: 4, dashArray: '1 10', lineCap: 'round' }} />
      )}

      {routes.flatMap((r) => (r.stops || []).map((s) => (
        <Marker key={r.id + s.id} position={[s.lat, s.lng]} icon={stopIcon(r.color, highlightStopId === `${r.id}:${s.id}`)}
          eventHandlers={onStopClick ? { click: () => onStopClick(r, s) } : undefined}>
          <Tooltip direction="top" offset={[0, -8]}>{s.name}</Tooltip>
        </Marker>
      )))}

      {buses.filter((b) => b.live?.lat != null).map((b) => {
        const color = routeById[b.routeId]?.color || '#111111'
        const label = (b.number || '').replace(/\D/g, '') || 'B'
        return (
          <AnimatedMarker key={b.id} position={[b.live.lat, b.live.lng]}
            icon={busIcon({ label, color: isLight(color) ? '#111111' : color, heading: b.live.heading || 0, active: b.live.active, selected: b.id === selectedBusId })}
            onClick={onSelectBus ? () => onSelectBus(b.id) : undefined}>
            <Tooltip direction="top" offset={[0, -24]}>{b.number}{b.live.active ? '' : ' (offline)'}</Tooltip>
          </AnimatedMarker>
        )
      })}
    </MapContainer>
  )
}
