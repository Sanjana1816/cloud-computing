import { useState } from 'react'
import { LayoutDashboard, Users, Bus, Route as RouteIcon, Megaphone, History } from 'lucide-react'
import { TopBar } from '../components/ui'
import Overview from './admin/Overview'
import UsersTab from './admin/UsersTab'
import FleetTab from './admin/FleetTab'
import RoutesTab from './admin/RoutesTab'
import AlertsTab from './admin/AlertsTab'
import TripsTab from './admin/TripsTab'

const TABS = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, el: Overview },
  { id: 'users', label: 'People', icon: Users, el: UsersTab },
  { id: 'fleet', label: 'Buses', icon: Bus, el: FleetTab },
  { id: 'routes', label: 'Routes', icon: RouteIcon, el: RoutesTab },
  { id: 'alerts', label: 'Alerts', icon: Megaphone, el: AlertsTab },
  { id: 'trips', label: 'Trips', icon: History, el: TripsTab },
]

export default function AdminPanel() {
  const [tab, setTab] = useState(() => {
    try { return sessionStorage.getItem('rr-admin-tab') || 'overview' } catch { return 'overview' }
  })
  const choose = (id) => { setTab(id); try { sessionStorage.setItem('rr-admin-tab', id) } catch { /* private mode */ } }
  const Active = TABS.find((t) => t.id === tab)?.el || Overview

  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-line bg-surface p-2 md:w-60 md:flex-col md:border-b-0 md:border-r md:p-4">
          {TABS.map(({ id, label, icon: I }) => (
            <button key={id} onClick={() => choose(id)}
              className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${tab === id ? 'bg-ink text-white' : 'text-muted hover:bg-canvas hover:text-ink'}`}>
              <I className={`h-4 w-4 ${tab === id ? 'text-lime' : ''}`} />{label}
            </button>
          ))}
        </nav>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl p-4 md:p-8"><Active /></div>
        </main>
      </div>
    </div>
  )
}
