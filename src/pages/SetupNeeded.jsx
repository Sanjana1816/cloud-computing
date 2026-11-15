import { Logo } from '../components/ui'

// only shows up when the firebase env vars are missing
export default function SetupNeeded() {
  return (
    <div className="grid min-h-full place-items-center p-6">
      <div className="card max-w-lg p-8">
        <Logo size="lg" />
        <h1 className="mt-6 text-2xl font-extrabold">Firebase isn’t connected yet</h1>
        <p className="mt-2 text-sm font-medium text-ink/70">
          Copy <code className="rounded bg-sun px-1">.env.example</code> to <code className="rounded bg-sun px-1">.env.local</code> and
          fill in the values from Firebase Console → Project settings → Your apps. On Vercel, add the same keys under
          Settings → Environment Variables and redeploy.
        </p>
      </div>
    </div>
  )
}
