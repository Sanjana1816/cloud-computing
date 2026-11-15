import { useState } from 'react'
import { LayoutDashboard, Users, Bus, Route as RouteIcon, Megaphone, History } from 'lucide-react'
import { TopBar } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import Overview from './admin/Overview'
import UsersTab from './admin/UsersTab'
import FleetTab from './admin/FleetTab'
import RoutesTab from './admin/RoutesTab'
import AlertsTab from './admin/AlertsTab'
import TripsTab from './admin/TripsTab'

const TABS = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, el: Overview, color: 'bg-lime' },
  { id: 'users', label: 'People', icon: Users, el: UsersTab, color: 'bg-pink' },
  { id: 'fleet', label: 'Buses', icon: Bus, el: FleetTab, color: 'bg-sun' },
  { id: 'routes', label: 'Routes', icon: RouteIcon, el: RoutesTab, color: 'bg-lilac' },
  { id: 'alerts', label: 'Alerts', icon: Megaphone, el: AlertsTab, color: 'bg-tangerine' },
  { id: 'trips', label: 'Trips', icon: History, el: TripsTab, color: 'bg-mint' },
]

export default function AdminPanel() {
  const { profile } = useAuth()
  const [tab, setTab] = useState(() => {
    try { return sessionStorage.getItem('rr-admin-tab') || 'overview' } catch { return 'overview' }
  })
  const choose = (id) => { setTab(id); try { sessionStorage.setItem('rr-admin-tab', id) } catch { /* private mode */ } }
  const Active = TABS.find((t) => t.id === tab)?.el || Overview

  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <nav className="flex shrink-0 gap-1.5 overflow-x-auto border-b-2 border-ink bg-cream p-2 md:w-56 md:flex-col md:border-b-0 md:border-r-2 md:p-4">
          <div className="mb-4 hidden px-1 md:block">
            <div className="font-display text-2xl font-extrabold leading-tight">hey {profile.name.split(' ')[0].toLowerCase()} 👋</div>
            <div className="text-xs font-semibold text-ink/50">transport office</div>
          </div>
          {TABS.map(({ id, label, icon: I, color }) => (
            <button key={id} onClick={() => choose(id)}
              className={`flex shrink-0 items-center gap-2.5 rounded-xl border-2 px-3 py-2 text-sm font-extrabold transition ${tab === id ? `border-ink ${color} shadow-hard-sm` : 'border-transparent hover:border-ink/20'}`}>
              <I className="h-4 w-4" strokeWidth={2.5} />{label}
            </button>
          ))}
        </nav>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Active />
        </main>
      </div>
    </div>
  )
}
