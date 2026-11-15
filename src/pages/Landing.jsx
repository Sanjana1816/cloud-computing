import { lazy, Suspense, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Zap, ShieldCheck, Globe2, Cpu, Server, Users, MapPin, Bell, Smartphone, GraduationCap, UserCog, Navigation,
} from 'lucide-react'
import { Logo, LiveDot, homeFor } from '../components/ui'
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
      <div className="absolute left-4 top-4 z-[500] flex items-center gap-2 rounded-full bg-surface/95 px-3 py-1.5 text-xs font-semibold shadow-soft backdrop-blur">
        <LiveDot /> Bus 01 is live
      </div>
      <div className="absolute inset-x-4 bottom-4 z-[500] rounded-3xl bg-ink p-4 text-white shadow-lift">
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet font-display text-lg font-extrabold">01</span>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-white/50">Your stop</div>
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
  { icon: MapPin, title: 'Live map', text: 'Every bus on one map, moving in real time.' },
  { icon: Navigation, title: 'ETA to your stop', text: 'Measured along the actual route, not a straight line.' },
  { icon: Bell, title: 'Heads-up alerts', text: 'A ping when your bus is 2 minutes away, plus delay notices.' },
  { icon: Users, title: 'Seat status', text: 'Drivers mark the bus as free, standing or full.' },
]

const CLOUD = [
  { icon: Zap, title: 'Real-time sync', text: 'Firestore listeners push each GPS update to every screen in well under a second.', tag: 'Distributed computing' },
  { icon: ShieldCheck, title: 'Roles and trust', text: 'Student, driver and admin permissions are checked on Google’s servers. Drivers need admin approval first.', tag: 'IAM · Security' },
  { icon: Cpu, title: 'Edge processing', text: 'The driver’s phone filters bad GPS points and only uploads real movement.', tag: 'Fog computing' },
  { icon: Users, title: 'Scales on its own', text: 'One driver writes, hundreds of students read. No servers to resize.', tag: 'Load balancing' },
  { icon: Globe2, title: 'Always available', text: 'Global CDN, replicated database and an offline cache on every phone.', tag: 'High availability' },
  { icon: Server, title: 'Serverless jobs', text: 'Cloud Functions close dead trips and keep a tamper-proof audit log.', tag: 'PaaS · Utility' },
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
          <a href="#cloud" className="hover:text-ink">Under the hood</a>
        </nav>
        <Link to={cta} className="btn-primary">{user ? 'Open app' : 'Log in'}</Link>
      </header>

      {/* hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-8 sm:px-6 lg:grid-cols-2 lg:pt-14">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold shadow-soft">
            <LiveDot /> Live tracking for college buses
          </span>
          <h1 className="mt-6 text-5xl font-extrabold leading-[1.02] sm:text-6xl">
            Never miss the <span className="whitespace-nowrap rounded-2xl bg-lime px-2">college bus</span> again.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">
            See your bus moving on a live map and know exactly when it reaches your stop. The driver’s phone does the tracking.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={cta} className="btn-primary px-6 py-3 text-base">Track my bus <ArrowRight className="h-4 w-4" /></Link>
            <a href="#how" className="btn-ghost px-6 py-3 text-base">How it works</a>
          </div>
          <div className="mt-10 flex gap-8">
            {[['< 1s', 'update time'], ['3', 'user roles'], ['0', 'servers to run']].map(([v, l]) => (
              <div key={l}>
                <div className="font-display text-2xl font-extrabold">{v}</div>
                <div className="text-xs text-muted">{l}</div>
              </div>
            ))}
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
          <div className="eyebrow">How it works</div>
          <h2 className="mt-3 text-4xl font-extrabold">One app, three roles.</h2>
          <p className="mt-3 text-muted">Everyone sees only what they need, and the database enforces it.</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { icon: Smartphone, role: 'Driver', step: '01', tone: 'bg-amber-soft text-amber-deep', text: 'Taps Start trip. Their phone’s GPS is sent to the cloud every few seconds.' },
            { icon: UserCog, role: 'Admin', step: '02', tone: 'bg-pink-soft text-pink', text: 'Verifies drivers, manages routes and buses, and sends delay alerts.' },
            { icon: GraduationCap, role: 'Student', step: '03', tone: 'bg-violet-soft text-violet-deep', text: 'Picks a stop and watches the bus come in, with a live ETA.' },
          ].map(({ icon: I, role, step, tone, text }) => (
            <div key={role} className="card p-7">
              <div className="flex items-center justify-between">
                <span className={`grid h-11 w-11 place-items-center rounded-2xl ${tone}`}><I className="h-5 w-5" /></span>
                <span className="font-mono text-xs text-muted">{step}</span>
              </div>
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
              <div className="text-[11px] font-bold uppercase tracking-[.12em] text-white/40">Under the hood</div>
              <h2 className="mt-3 text-4xl font-extrabold">Built on the cloud, end to end.</h2>
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
              {CLOUD.map(({ icon: I, title, text, tag }) => (
                <div key={title} className="flex gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-lime"><I className="h-5 w-5" /></span>
                  <div>
                    <h3 className="font-sans font-semibold">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-white/55">{text}</p>
                    <div className="mt-2 text-[11px] font-semibold text-violet-soft/70">{tag}</div>
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
            <h2 className="text-3xl font-extrabold">Stop waiting blind.</h2>
            <p className="mt-1 text-muted">Log in with your college email and see your bus right now.</p>
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
