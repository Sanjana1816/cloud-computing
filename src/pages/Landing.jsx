import { lazy, Suspense, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Zap, ShieldCheck, Globe2, Cpu, Server, Users, MapPin, Bell, Smartphone, UserRound, UserCog, Navigation,
} from 'lucide-react'
import { Logo, homeFor } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { DEMO_ROUTES } from '../lib/seed'
import { pathLength, pointAlong, etaSeconds, fmtEta } from '../lib/geo'

const LiveMap = lazy(() => import('../components/LiveMap'))

// fake bus that drives along the sample route so the hero map feels alive
function useDemoBus(route) {
  const [d, setD] = useState(600)
  useEffect(() => {
    const t = setInterval(() => setD((x) => x + 60), 1500)
    return () => clearInterval(t)
  }, [])
  const total = pathLength(route.path)
  const p = pointAlong(route.path, d % total)
  return { id: 'demo', number: 'Bus 01', routeId: route.id, live: { ...p, active: true, speed: 8 } }
}

function HeroMap() {
  const route = DEMO_ROUTES[0]
  const bus = useDemoBus(route)
  const stop = route.stops[2]
  const eta = etaSeconds(route, bus.live, stop)
  return (
    <div className="relative h-[460px] overflow-hidden rounded-4xl border border-line bg-surface shadow-lift sm:h-[520px]">
      <Suspense fallback={<div className="h-full w-full bg-canvas" />}>
        <LiveMap routes={[route]} buses={[bus]} highlightStopId={`${route.id}:${stop.id}`} interactive={false} fitPadding={[[40, 70], [40, 150]]} />
      </Suspense>
      <div className="absolute inset-x-4 bottom-4 z-[500] rounded-3xl bg-ink p-4 text-white shadow-lift">
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet font-display text-lg font-extrabold">{route.code}</span>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-white/50">Route {route.code} to your stop</div>
            <div className="truncate font-semibold">{stop.name}</div>
          </div>
          <div className="text-right">
            <div className="font-display text-3xl font-extrabold leading-none text-lime">{fmtEta(eta?.seconds)}</div>
            <div className="mt-1 text-[11px] text-white/50">arriving</div>
          </div>
        </div>
      </div>
    </div>
  )
}

const FEATURES = [
  { icon: MapPin, title: 'Live map', text: 'Every bus on the route, moving on the map as it drives.' },
  { icon: Navigation, title: 'ETA to your stop', text: 'Measured along the actual route, not a straight line.' },
  { icon: Bell, title: 'Alerts', text: 'A ping when your bus is 2 minutes from the stop, plus delay and breakdown notices.' },
  { icon: Users, title: 'How crowded', text: 'The driver marks the bus as seats free, standing or full.' },
]

const CLOUD = [
  { icon: Zap, title: 'Real-time sync', text: 'Firestore listeners push each GPS update to every screen in well under a second.' },
  { icon: ShieldCheck, title: 'Roles and trust', text: 'Passenger, driver and admin permissions are checked on Google’s servers. Drivers need admin approval first.' },
  { icon: Cpu, title: 'Edge processing', text: 'The driver’s phone filters bad GPS points and only uploads real movement.' },
  { icon: Users, title: 'Scales on its own', text: 'One driver writes, hundreds of passengers read. No servers to resize.' },
  { icon: Globe2, title: 'Always available', text: 'Global CDN, replicated database and an offline cache on every phone.' },
  { icon: Server, title: 'Serverless jobs', text: 'Cloud Functions close dead trips and keep a tamper-proof audit log.' },
]

export default function Landing() {
  const { user, profile } = useAuth()
  const cta = user && profile ? homeFor(profile.role) : '/login'

  return (
    <div className="min-h-full overflow-x-hidden">
      <header className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm font-medium text-muted md:flex">
          <a href="#features" className="hover:text-ink">Features</a>
          <a href="#how" className="hover:text-ink">How it works</a>
          <a href="#cloud" className="hover:text-ink">Cloud</a>
        </nav>
        <Link to={cta} className="btn-primary">{user ? 'Open app' : 'Log in'}</Link>
      </header>

      {/* hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-8 sm:px-6 lg:grid-cols-2 lg:pt-14">
        <div>
          <h1 className="text-5xl font-extrabold leading-[1.02] sm:text-6xl">
            Know when your <span className="whitespace-nowrap rounded-2xl bg-lime px-2">bus</span> is coming.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">
            Live tracking for city buses like DTC. See where your bus is on the map and how many minutes it is from your stop, instead of standing there guessing.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={cta} className="btn-primary px-6 py-3 text-base">Track my bus <ArrowRight className="h-4 w-4" /></Link>
            <a href="#how" className="btn-ghost px-6 py-3 text-base">How it works</a>
          </div>
        </div>
        <HeroMap />
      </section>

      {/* features */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-16 sm:px-6">
        <div className="grid gap-4 md:grid-cols-4">
          {FEATURES.map(({ icon: I, title, text }) => (
            <div key={title} className="card p-6">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-lime-soft text-lime-deep"><I className="h-5 w-5" /></span>
              <h3 className="mt-5 text-lg font-bold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section id="how" className="mx-auto max-w-6xl px-5 py-16 sm:px-6">
        <div className="max-w-xl">
          <h2 className="text-4xl font-extrabold">How it works</h2>
          <p className="mt-3 text-muted">Three kinds of users. Each one only sees what they need, and the database enforces it.</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { icon: Smartphone, role: 'Driver', tone: 'bg-amber-soft text-amber-deep', text: 'Taps Start trip when the bus leaves the depot. The phone’s GPS is sent to the cloud every few seconds.' },
            { icon: UserCog, role: 'Depot admin', tone: 'bg-pink-soft text-pink', text: 'Verifies drivers, sets up routes, stops and buses, and sends delay or breakdown alerts.' },
            { icon: UserRound, role: 'Passenger', tone: 'bg-violet-soft text-violet-deep', text: 'Picks their bus stop and sees which bus is coming next and in how many minutes.' },
          ].map(({ icon: I, role, tone, text }) => (
            <div key={role} className="card p-7">
              <span className={`grid h-11 w-11 place-items-center rounded-2xl ${tone}`}><I className="h-5 w-5" /></span>
              <h3 className="mt-6 text-xl font-bold">{role}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* cloud */}
      <section id="cloud" className="mx-auto max-w-6xl px-5 py-16 sm:px-6">
        <div className="overflow-hidden rounded-4xl bg-ink p-8 text-white sm:p-12">
          <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
            <div>
              <h2 className="text-4xl font-extrabold">How the cloud part works</h2>
              <p className="mt-3 text-sm text-white/55">Nothing runs on our own servers. Everything is a managed cloud service.</p>
              <div className="mt-8 space-y-2">
                {[['SaaS', 'routeradar', 'bg-lime text-ink'], ['PaaS', 'Firebase + Vercel', 'bg-violet'], ['IaaS', 'Google / AWS data centres', 'bg-white/10']].map(([l, w, c]) => (
                  <div key={l} className="flex items-center gap-3 rounded-2xl bg-white/5 p-2 pr-4">
                    <span className={`w-16 rounded-xl py-2 text-center text-sm font-bold ${c}`}>{l}</span>
                    <span className="text-sm text-white/70">{w}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
              {CLOUD.map(({ icon: I, title, text }) => (
                <div key={title} className="flex gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-lime"><I className="h-5 w-5" /></span>
                  <div>
                    <h3 className="font-sans font-semibold">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-white/55">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* cta */}
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-6 sm:px-6">
        <div className="card flex flex-col items-start justify-between gap-6 p-8 sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="text-3xl font-extrabold">Waiting at the stop?</h2>
            <p className="mt-1 text-muted">Log in and see where your bus is right now.</p>
          </div>
          <Link to={cta} className="btn-lime px-6 py-3 text-base">Get started <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      <footer className="border-t border-line py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 text-xs text-muted sm:px-6">
          <Logo />
          <span>Cloud Computing project (BCS 304) · Firebase + Vercel</span>
        </div>
      </footer>
    </div>
  )
}
