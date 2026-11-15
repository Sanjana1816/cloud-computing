import { useEffect, useMemo, useRef } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const CAMPUS = [28.6656, 77.2324]

// cache icons so re-renders don't rebuild the DOM (that would restart the pulse)
const iconCache = new Map()
function cached(key, make) {
  if (!iconCache.has(key)) iconCache.set(key, make())
  return iconCache.get(key)
}

function busIcon({ label, color, heading = 0, active, selected }) {
  const h = Math.round(heading / 5) * 5
  const fill = active ? color : '#d6d3cc'
  return cached(`bus|${label}|${color}|${h}|${active}|${selected}`, () => L.divIcon({
    className: '',
    iconSize: [46, 46],
    iconAnchor: [23, 23],
    html: `
      <div style="position:relative;width:46px;height:46px;display:grid;place-items:center">
        ${active ? `<span class="animate-pulsering" style="position:absolute;inset:8px;border-radius:12px;background:${color}"></span>` : ''}
        <div style="position:absolute;inset:0;transform:rotate(${h}deg)">
          <div style="position:absolute;left:50%;top:-4px;transform:translateX(-50%);width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-bottom:10px solid #141414"></div>
        </div>
        <div style="position:relative;width:34px;height:34px;border-radius:10px;background:${fill};border:2.5px solid #141414;
          box-shadow:${selected ? '4px 4px 0 #FF7EC7' : '3px 3px 0 #141414'};
          display:grid;place-items:center;color:#141414;font:800 13px 'Bricolage Grotesque',sans-serif">${label}</div>
      </div>`,
  }))
}

function stopIcon(highlighted) {
  const s = highlighted ? 24 : 14
  return cached(`stop|${highlighted}`, () => L.divIcon({
    className: '',
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
    html: highlighted
      ? `<div style="width:${s}px;height:${s}px;border-radius:999px;background:#FF7EC7;border:3px solid #141414;box-shadow:2px 2px 0 #141414;display:grid;place-items:center;font-size:11px">★</div>`
      : `<div style="width:${s}px;height:${s}px;border-radius:999px;background:#fff;border:3px solid #141414"></div>`,
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

function FitRoutes({ routes }) {
  const map = useMap()
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    const pts = routes.flatMap((r) => (r.path || []).map((p) => [p.lat, p.lng]))
    if (pts.length > 1) { map.fitBounds(pts, { padding: [40, 40] }); done.current = true }
  }, [routes, map])
  return null
}

// shared map for student / driver / admin screens
export default function LiveMap({
  routes = [], buses = [], selectedBusId, onSelectBus, highlightStopId, onStopClick,
  flyTo, onMapClick, draftPath, className = '',
}) {
  const routeById = useMemo(() => Object.fromEntries(routes.map((r) => [r.id, r])), [routes])
  return (
    <MapContainer center={CAMPUS} zoom={14} zoomControl={false} className={`h-full w-full ${className}`}>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
      />
      <FitRoutes routes={routes} />
      <FlyTo target={flyTo} />
      {onMapClick && <ClickCapture onMapClick={onMapClick} />}

      {routes.map((r) => (
        <Polyline key={r.id + '-casing'} positions={(r.path || []).map((p) => [p.lat, p.lng])}
          pathOptions={{ color: '#141414', weight: 9, opacity: 1, lineJoin: 'round' }} />
      ))}
      {routes.map((r) => (
        <Polyline key={r.id} positions={(r.path || []).map((p) => [p.lat, p.lng])}
          pathOptions={{ color: r.color, weight: 5, opacity: 1, lineJoin: 'round', dashArray: r.draft ? '8 8' : undefined }} />
      ))}
      {draftPath?.length > 0 && (
        <Polyline positions={draftPath.map((p) => [p.lat, p.lng])} pathOptions={{ color: '#FF7EC7', weight: 5, dashArray: '8 8' }} />
      )}

      {routes.flatMap((r) => (r.stops || []).map((s) => (
        <Marker key={r.id + s.id} position={[s.lat, s.lng]} icon={stopIcon(highlightStopId === `${r.id}:${s.id}`)}
          eventHandlers={onStopClick ? { click: () => onStopClick(r, s) } : undefined}>
          <Tooltip direction="top" offset={[0, -8]}>{s.name}</Tooltip>
        </Marker>
      )))}

      {buses.filter((b) => b.live?.lat != null).map((b) => {
        const color = routeById[b.routeId]?.color || '#C6F45D'
        const label = (b.number || '').replace(/\D/g, '') || 'B'
        return (
          <AnimatedMarker key={b.id} position={[b.live.lat, b.live.lng]}
            icon={busIcon({ label, color, heading: b.live.heading || 0, active: b.live.active, selected: b.id === selectedBusId })}
            onClick={onSelectBus ? () => onSelectBus(b.id) : undefined}>
            <Tooltip direction="top" offset={[0, -22]}>{b.number}{b.live.active ? '' : ' (offline)'}</Tooltip>
          </AnimatedMarker>
        )
      })}
    </MapContainer>
  )
}
