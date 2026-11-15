import { Link } from 'react-router-dom'
import {
  Zap, ShieldCheck, Globe2, Cpu, Server, Users, ArrowRight, ArrowUpRight, Smartphone, GraduationCap,
  UserCog, Clock, MessageCircleWarning, EyeOff, MapPin,
} from 'lucide-react'
import { Logo, homeFor } from '../components/ui'
import { useAuth } from '../context/AuthContext'

const TICKER = ['live gps', 'eta to your stop', 'delay alerts', 'seat status', 'verified drivers', 'works on any phone']

const UNDER_THE_HOOD = [
  { icon: Zap, title: 'Real-time sync', text: 'The driver’s phone sends a location and every open screen updates in well under a second. No refresh button.', tag: 'firestore listeners', color: 'bg-lime' },
  { icon: ShieldCheck, title: 'Roles + trust', text: 'Students, drivers and admins each get different permissions. Google’s servers check them, so a modded app can’t cheat.', tag: 'IAM / security rules', color: 'bg-pink' },
  { icon: Users, title: 'Scales by itself', text: 'One driver writes and 500 students read. We don’t run or resize any servers for that.', tag: 'load balancing', color: 'bg-sun' },
  { icon: Globe2, title: 'Always up', text: 'The site is served from Vercel’s CDN and the database is replicated by Google. It also keeps working offline.', tag: 'high availability', color: 'bg-lilac' },
  { icon: Cpu, title: 'Smart on the phone', text: 'The driver’s phone drops bad GPS points and only uploads when the bus actually moves. Fewer writes, smaller bill.', tag: 'edge / fog computing', color: 'bg-mint' },
  { icon: Server, title: 'Serverless jobs', text: 'Cloud Functions close trips when a phone dies and keep an audit log nobody can edit.', tag: 'cloud functions', color: 'bg-tangerine' },
]

const PAINS = [
  { icon: Clock, title: 'the 8:40 panic', text: 'You’re at the stop and the bus is either 2 mins away or already gone. Nobody knows which.', color: 'bg-sun', rot: '-rotate-1' },
  { icon: MessageCircleWarning, title: 'whatsapp telephone', text: '"bus 3 broke down??" gets forwarded 40 times and reaches you after you’ve already waited 20 mins.', color: 'bg-pink', rot: 'rotate-1' },
  { icon: EyeOff, title: 'zero visibility', text: 'The transport office can’t see where the fleet is and has no trip data to plan better routes.', color: 'bg-lilac', rot: '-rotate-1' },
]

function PhoneMock() {
  return (
    <div className="relative mx-auto w-[290px] sm:w-[320px]">
      <div className="absolute -left-10 top-10 z-20 hidden rotate-[-10deg] sm:block">
        <span className="sticker bg-pink">no more guessing</span>
      </div>
      <div className="absolute -right-6 bottom-28 z-20 rotate-[8deg]">
        <span className="sticker bg-lime">● live</span>
      </div>
      <div className="rounded-[2.4rem] border-[3px] border-ink bg-ink p-2.5 shadow-hard-lg">
        <div className="relative overflow-hidden rounded-[1.9rem] bg-[#F2EEE3]">
          {/* toy map */}
          <svg viewBox="0 0 300 420" className="block h-[420px] w-full">
            <rect width="300" height="420" fill="#F2EEE3" />
            {[[0, 90, 300, 70], [0, 250, 300, 300], [60, 0, 110, 420], [210, 0, 180, 420]].map(([x1, y1, x2, y2], i) => (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff" strokeWidth="14" />
            ))}
            <rect x="130" y="130" width="60" height="70" rx="8" fill="#C9E7B5" />
            <rect x="20" y="300" width="70" height="60" rx="8" fill="#BFD9F2" />
            <path d="M40 390 C 70 300, 90 260, 150 230 S 230 140, 250 40" fill="none" stroke="#141414" strokeWidth="11" strokeLinecap="round" />
            <path d="M40 390 C 70 300, 90 260, 150 230 S 230 140, 250 40" fill="none" stroke="#3D6BFF" strokeWidth="6" strokeLinecap="round" />
            {[[40, 390], [150, 230], [250, 40]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="7" fill="#fff" stroke="#141414" strokeWidth="3" />)}
            <circle cx="250" cy="40" r="11" fill="#FF7EC7" stroke="#141414" strokeWidth="3" />
          </svg>
          <div className="absolute left-[118px] top-[262px] animate-bob">
            <span className="grid h-10 w-10 place-items-center rounded-xl border-[2.5px] border-ink bg-lime font-display text-sm font-extrabold shadow-hard-sm">01</span>
          </div>
          <div className="absolute inset-x-3 bottom-3 rounded-2xl border-2 border-ink bg-cream p-3 shadow-hard-sm">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl border-2 border-ink bg-lime font-display font-extrabold">01</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-extrabold">Bus 01 to North Campus</div>
                <div className="text-xs text-ink/60">your stop: Civil Lines</div>
              </div>
              <div className="text-right">
                <div className="font-display text-2xl font-extrabold leading-none">4</div>
                <div className="text-[10px] font-bold uppercase">min</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Landing() {
  const { user, profile } = useAuth()
  const cta = user && profile ? homeFor(profile.role) : '/login'

  return (
    <div className="min-h-full overflow-x-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <Link to={cta} className="btn-dark">{user ? 'Open app' : 'Log in'} <ArrowRight className="h-4 w-4" /></Link>
      </header>

      {/* hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:pt-12">
        <div>
          <span className="sticker -rotate-2 bg-sun">🚌 for campus buses</span>
          <h1 className="mt-6 font-display text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl">
            where&rsquo;s my<br /><span className="scribble px-1">bus</span>??
          </h1>
          <p className="mt-6 max-w-lg text-lg font-medium text-ink/70">
            See your college bus move on a live map and know exactly when it reaches <b className="text-ink">your</b> stop.
            The driver’s phone is the GPS. No extra hardware, nothing to install.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={cta} className="btn-primary px-6 py-3.5 text-base">Track my bus <ArrowUpRight className="h-5 w-5" /></Link>
            <a href="#how" className="btn-ghost px-6 py-3.5 text-base">How it works</a>
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            {[['<1s', 'update delay', 'bg-lime'], ['3', 'user roles', 'bg-pink'], ['24/7', 'uptime', 'bg-lilac']].map(([v, l, c]) => (
              <div key={l} className={`rounded-2xl border-2 border-ink ${c} px-4 py-2.5 shadow-hard-sm`}>
                <div className="font-display text-2xl font-extrabold leading-none">{v}</div>
                <div className="text-[11px] font-bold uppercase tracking-wide">{l}</div>
              </div>
            ))}
          </div>
        </div>
        <PhoneMock />
      </section>

      {/* ticker */}
      <div className="-rotate-1 border-y-2 border-ink bg-ink py-3">
        <div className="flex w-max animate-marquee gap-8 whitespace-nowrap font-display text-xl font-extrabold uppercase text-lime">
          {[...TICKER, ...TICKER, ...TICKER, ...TICKER].map((t, i) => <span key={i}>{t} <span className="text-pink">✦</span></span>)}
        </div>
      </div>

      {/* problem */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="font-display text-4xl font-extrabold tracking-tight">the problem <span className="text-ink/30">(you know it)</span></h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {PAINS.map(({ icon: I, title, text, color, rot }) => (
            <div key={title} className={`card ${color} ${rot} p-6 transition hover:rotate-0`}>
              <I className="h-7 w-7" strokeWidth={2.5} />
              <h3 className="mt-4 text-xl font-extrabold">{title}</h3>
              <p className="mt-2 text-sm font-medium text-ink/75">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* roles */}
      <section id="how" className="border-y-2 border-ink bg-cream">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="font-display text-4xl font-extrabold tracking-tight">one app, three roles</h2>
          <p className="mt-2 max-w-xl font-medium text-ink/60">Everyone sees only what they need. The database enforces this too, not just the screen.</p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { icon: GraduationCap, role: 'student', color: 'bg-cobalt text-white', points: ['live map of every bus', 'ETA to your saved stop', 'seats left + delay alerts'] },
              { icon: Smartphone, role: 'driver', color: 'bg-sun', points: ['one tap to start a trip', 'phone GPS goes to the cloud', 'mark the bus full / standing'] },
              { icon: UserCog, role: 'admin', color: 'bg-pink', points: ['verify drivers before they go live', 'routes, stops, buses', 'send alerts + see trip history'] },
            ].map(({ icon: I, role, color, points }, i) => (
              <div key={role} className="card p-6 transition hover:-translate-y-1 hover:shadow-hard-lg">
                <div className="flex items-center justify-between">
                  <span className={`grid h-12 w-12 place-items-center rounded-xl border-2 border-ink ${color}`}><I className="h-6 w-6" /></span>
                  <span className="font-mono text-sm text-ink/40">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-2xl font-extrabold capitalize">{role}</h3>
                <ul className="mt-3 space-y-2 text-sm font-medium">
                  {points.map((p) => <li key={p} className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{p}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* cloud bits */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <span className="sticker rotate-1 bg-lime">for the nerds</span>
        <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight">what’s running under the hood</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {UNDER_THE_HOOD.map(({ icon: I, title, text, tag, color }) => (
            <div key={title} className="card group p-6 transition hover:-translate-y-1 hover:shadow-hard-lg">
              <span className={`grid h-11 w-11 place-items-center rounded-xl border-2 border-ink ${color} transition group-hover:-rotate-6`}><I className="h-5 w-5" strokeWidth={2.5} /></span>
              <h3 className="mt-4 text-lg font-extrabold">{title}</h3>
              <p className="mt-1.5 text-sm font-medium text-ink/65">{text}</p>
              <span className="mt-4 inline-block font-mono text-[11px] uppercase text-ink/45">#{tag}</span>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            ['SaaS', 'routeradar itself', 'what you use', 'bg-lime'],
            ['PaaS', 'firebase + vercel', 'what we build on', 'bg-sun'],
            ['IaaS', 'google / aws data centres', 'what we never touch', 'bg-pink'],
          ].map(([layer, what, who, c]) => (
            <div key={layer} className={`rounded-2xl border-2 border-ink ${c} p-5 shadow-hard`}>
              <div className="font-display text-4xl font-extrabold">{layer}</div>
              <div className="mt-2 font-bold">{what}</div>
              <div className="text-sm font-medium text-ink/60">{who}</div>
            </div>
          ))}
        </div>
      </section>

      {/* cta */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border-2 border-ink bg-cobalt p-10 text-center text-white shadow-hard-lg sm:p-14">
          <span className="sticker absolute left-6 top-6 -rotate-6 bg-sun text-ink">free for students</span>
          <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">stop waiting blind.</h2>
          <p className="mt-3 font-medium text-white/80">Log in with your college email and see your bus right now.</p>
          <Link to={cta} className="btn mt-7 bg-lime px-7 py-3.5 text-base">Let’s go <ArrowRight className="h-5 w-5" /></Link>
        </div>
      </section>

      <footer className="border-t-2 border-ink py-6 text-center text-xs font-bold text-ink/50">
        routeradar · cloud computing project (BCS 304) · firebase + vercel
      </footer>
    </div>
  )
}
