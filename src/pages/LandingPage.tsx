import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'

const movementTracks = [
  {
    title: 'Calisthenics',
    description: 'Build strength through deliberate, bodyweight movement patterns.',
    schedule: 'Mon · Wed · Fri',
  },
  {
    title: 'Mat Pilates',
    description: 'Core stability and controlled flow for alignment and recovery.',
    schedule: 'Tue · Thu · Sat',
  },
  {
    title: 'Vinyasa Yoga',
    description: 'Breath-led sequences that connect mobility, balance, and presence.',
    schedule: 'Daily mornings',
  },
  {
    title: 'Circuit Training',
    description: 'High-intensity functional blocks for endurance and power.',
    schedule: 'Wed · Sat evenings',
  },
]

const features = [
  {
    title: 'Capitol Centrum Studio',
    body: 'A grounded, earthy space designed for focused movement and community.',
  },
  {
    title: 'Expert Coaches',
    body: 'Guidance from instructors trained in calisthenics, yoga, and functional fitness.',
  },
  {
    title: 'Member Community',
    body: 'Connect with fellow movers, track progress, and join workshops together.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-balanse-cream">
      <Navbar />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-balanse-clay/40 via-transparent to-balanse-sage/10" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
          <div>
            <p className="mb-4 inline-block rounded-full border border-balanse-clay bg-white/60 px-4 py-1.5 text-sm font-medium text-balanse-sage">
              Capitol Centrum · Yoga & Calisthenics
            </p>
            <h1 className="text-4xl font-extrabold leading-tight text-balanse-ink sm:text-5xl lg:text-6xl">
              Find your balance through movement
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-balanse-ink/75">
              Balansé blends the grounded energy of our studio with a modern approach to
              calisthenics, yoga, and functional training. Move with intention. Grow with
              community.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/signup"
                className="rounded-2xl bg-balanse-ink px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-balanse-sage"
              >
                Start your journey
              </Link>
              <Link
                to="/login"
                className="rounded-2xl border-2 border-balanse-sage px-8 py-3.5 text-sm font-semibold text-balanse-sage transition-colors hover:bg-balanse-sage hover:text-white"
              >
                Member login
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="aspect-[4/5] overflow-hidden rounded-2xl border border-balanse-clay bg-balanse-clay/50 shadow-xl">
              <div className="flex h-full flex-col justify-end bg-gradient-to-t from-balanse-ink/80 via-balanse-sage/30 to-balanse-terracotta/20 p-8">
                <span className="mb-2 inline-block w-fit rounded-xl bg-balanse-terracotta px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                  Movement Expo
                </span>
                <p className="font-heading text-2xl font-bold text-white">
                  Workshop weekend — March 15
                </p>
                <p className="mt-2 text-sm text-white/80">
                  Handstand foundations & mobility labs
                </p>
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 rounded-2xl border border-balanse-clay bg-white p-4 shadow-lg">
              <p className="font-heading text-3xl font-bold text-balanse-sage">500+</p>
              <p className="text-sm text-balanse-ink/70">Active members</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-balanse-clay bg-white/40 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-balanse-ink sm:text-4xl">
              Why Balansé
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-balanse-ink/70">
              Premium wellness meets deliberate athletic training in the heart of Capitol
              Centrum.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-balanse-clay bg-balanse-cream p-8 transition-shadow hover:shadow-md"
              >
                <h3 className="text-xl font-bold text-balanse-sage">{feature.title}</h3>
                <p className="mt-3 leading-relaxed text-balanse-ink/75">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-3xl font-bold text-balanse-ink sm:text-4xl">
                Movement tracks
              </h2>
              <p className="mt-3 max-w-xl text-balanse-ink/70">
                Clean schedules, clear progressions — from mat work to bar skills.
              </p>
            </div>
            <Link
              to="/signup"
              className="text-sm font-semibold text-balanse-terracotta hover:underline"
            >
              View full timetable →
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {movementTracks.map((track) => (
              <div
                key={track.title}
                className="rounded-xl border border-balanse-clay bg-balanse-cream p-6"
              >
                <h3 className="font-heading text-lg font-bold text-balanse-ink">
                  {track.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-balanse-ink/70">
                  {track.description}
                </p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-balanse-sage">
                  {track.schedule}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-balanse-ink py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to move with us?
          </h2>
          <p className="mt-4 text-lg text-white/70">
            Join the Balansé community and access your member dashboard, class schedule,
            and workshop updates.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to="/signup"
              className="rounded-2xl bg-balanse-terracotta px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-balanse-sage"
            >
              Create free account
            </Link>
            <Link
              to="/login"
              className="rounded-2xl border border-white/30 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:border-balanse-sage hover:text-balanse-sage"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-balanse-clay py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <p className="font-heading text-lg font-bold text-balanse-sage">Balansé</p>
          <p className="text-sm text-balanse-ink/60">
            © 2026 Balansé · Capitol Centrum · Yoga & Calisthenics
          </p>
        </div>
      </footer>
    </div>
  )
}
