import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { label: 'Home', icon: '🏠', active: true },
  { label: 'Schedule', icon: '📅', active: false },
  { label: 'My Classes', icon: '🧘', active: false },
  { label: 'Community', icon: '👥', active: false },
  { label: 'Progress', icon: '📈', active: false },
]

const feedPosts = [
  {
    author: 'Coach Mara',
    role: 'Calisthenics Lead · Capitol Centrum',
    time: '2h',
    content:
      'New progression block starts Monday — focus on hollow body holds and pull-up negatives. Who\'s joining the 7 AM session?',
    likes: 24,
    comments: 8,
    tag: 'Calisthenics',
  },
  {
    author: 'Balansé Studio',
    role: 'Official · Movement Expo',
    time: '5h',
    content:
      'Movement Expo workshop weekend is almost full! Handstand foundations, mobility labs, and community flow sessions — March 15 at Capitol Centrum.',
    likes: 56,
    comments: 12,
    tag: 'Workshop',
    highlight: true,
  },
  {
    author: 'Alex Rivera',
    role: 'Member · 6-month streak',
    time: '1d',
    content:
      'Hit my first strict muscle-up today after 4 months of consistent training here. Grateful for this community 🙏',
    likes: 89,
    comments: 21,
    tag: 'Community',
  },
]

const upcomingClasses = [
  { name: 'Morning Vinyasa', time: 'Today · 7:00 AM', track: 'Yoga' },
  { name: 'Calisthenics Foundations', time: 'Today · 6:00 PM', track: 'Calisthenics' },
  { name: 'Mat Pilates Flow', time: 'Tomorrow · 8:00 AM', track: 'Pilates' },
]

const suggestedMembers = [
  { name: 'Jordan Lee', focus: 'Handstand progressions' },
  { name: 'Sam Okonkwo', focus: 'Mobility & recovery' },
  { name: 'Priya Sharma', focus: 'Circuit training' },
]

function NavIcon({ label, active }: { label: string; active?: boolean }) {
  const icons: Record<string, string> = {
    Home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    Schedule: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    'My Classes': 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    Community: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    Progress: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  }

  const path = icons[label] ?? icons.Home

  return (
    <svg
      className={`h-5 w-5 ${active ? 'text-balanse-ink' : 'text-balanse-ink/60'}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  )
}

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="min-h-screen bg-balanse-clay/30">
      {/* Top header — LinkedIn-style */}
      <header className="sticky top-0 z-50 border-b border-balanse-clay bg-balanse-cream">
        <div className="mx-auto flex max-w-[1128px] items-center gap-4 px-4 py-2">
          <Link to="/dashboard" className="flex shrink-0 items-center gap-1.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-balanse-sage text-xs font-bold text-white">
              B
            </span>
            <span className="hidden font-heading text-lg font-bold text-balanse-ink sm:block">
              Balansé
            </span>
          </Link>

          <div className="hidden flex-1 sm:block">
            <div className="relative max-w-xs">
              <svg
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-balanse-ink/40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="search"
                placeholder="Search classes, members..."
                className="w-full rounded-lg border border-balanse-clay bg-balanse-cream py-2 pl-10 pr-4 text-sm outline-none focus:border-balanse-sage"
              />
            </div>
          </div>

          <nav className="ml-auto flex items-center gap-1 sm:gap-2">
            {navItems.slice(0, 4).map((item) => (
              <button
                key={item.label}
                type="button"
                className={`flex flex-col items-center rounded-lg px-2 py-1.5 text-[10px] font-medium transition-colors sm:px-3 sm:text-xs ${
                  item.active
                    ? 'text-balanse-ink'
                    : 'text-balanse-ink/60 hover:text-balanse-sage'
                }`}
              >
                <NavIcon label={item.label} active={item.active} />
                <span className="mt-0.5 hidden sm:block">{item.label}</span>
              </button>
            ))}

            <button
              type="button"
              onClick={handleLogout}
              className="ml-2 hidden rounded-xl border border-balanse-clay px-3 py-1.5 text-xs font-medium text-balanse-ink/70 transition-colors hover:border-balanse-terracotta hover:text-balanse-terracotta sm:block"
            >
              Sign out
            </button>

            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-balanse-sage text-xs font-bold text-white sm:ml-1">
              {initials}
            </div>
          </nav>
        </div>
      </header>

      {/* 3-column LinkedIn layout */}
      <div className="mx-auto grid max-w-[1128px] gap-6 px-4 py-6 lg:grid-cols-[225px_1fr_300px]">
        {/* Left sidebar */}
        <aside className="hidden space-y-2 lg:block">
          <div className="overflow-hidden rounded-2xl border border-balanse-clay bg-balanse-cream">
            <div className="h-14 bg-gradient-to-r from-balanse-sage to-balanse-terracotta/80" />
            <div className="px-4 pb-4">
              <div className="-mt-8 mb-3 flex h-16 w-16 items-center justify-center rounded-full border-4 border-balanse-cream bg-balanse-sage text-lg font-bold text-white">
                {initials}
              </div>
              <h2 className="font-heading text-base font-bold text-balanse-ink">{user?.name}</h2>
              <p className="text-xs text-balanse-ink/60">{user?.membership}</p>
              <p className="mt-1 text-xs text-balanse-ink/50">Capitol Centrum</p>
              <hr className="my-3 border-balanse-clay" />
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-balanse-sage font-medium">Classes this month</span>
                  <span className="font-semibold text-balanse-ink">12</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-balanse-sage font-medium">Movement streak</span>
                  <span className="font-semibold text-balanse-ink">18 days</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-balanse-clay bg-balanse-cream p-3">
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                  item.active
                    ? 'bg-balanse-clay/60 font-semibold text-balanse-ink'
                    : 'text-balanse-ink/70 hover:bg-balanse-clay/40'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </aside>

        {/* Main feed */}
        <main className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-balanse-clay bg-balanse-cream p-4">
            <div className="flex gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-balanse-sage text-sm font-bold text-white">
                {initials}
              </div>
              <button
                type="button"
                className="flex-1 rounded-full border border-balanse-clay px-4 py-3 text-left text-sm text-balanse-ink/50 transition-colors hover:bg-balanse-clay/30"
              >
                Share your movement win...
              </button>
            </div>
            <div className="mt-3 flex justify-around border-t border-balanse-clay pt-3">
              {['Photo', 'Class check-in', 'Achievement'].map((action) => (
                <button
                  key={action}
                  type="button"
                  className="text-xs font-medium text-balanse-ink/60 transition-colors hover:text-balanse-sage"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>

          {feedPosts.map((post) => (
            <article
              key={post.author + post.time}
              className="rounded-2xl border border-balanse-clay bg-balanse-cream p-4"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
                    post.highlight ? 'bg-balanse-terracotta' : 'bg-balanse-sage'
                  }`}
                >
                  {post.author
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-balanse-ink">{post.author}</h3>
                    {post.highlight && (
                      <span className="rounded-lg bg-balanse-terracotta px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                        Movement Expo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-balanse-ink/60">{post.role}</p>
                  <p className="text-xs text-balanse-ink/40">{post.time}</p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-balanse-ink/85">{post.content}</p>

              <span className="mt-3 inline-block rounded-lg bg-balanse-clay/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-balanse-sage">
                {post.tag}
              </span>

              <div className="mt-4 flex items-center gap-4 border-t border-balanse-clay pt-3 text-xs text-balanse-ink/60">
                <span>{post.likes} appreciations</span>
                <span>{post.comments} comments</span>
              </div>

              <div className="mt-2 flex gap-2">
                {['Appreciate', 'Comment', 'Share'].map((action) => (
                  <button
                    key={action}
                    type="button"
                    className="flex-1 rounded-xl py-2 text-xs font-medium text-balanse-ink/70 transition-colors hover:bg-balanse-clay/50"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </main>

        {/* Right sidebar */}
        <aside className="hidden space-y-4 xl:block">
          <div className="rounded-2xl border border-balanse-terracotta/30 bg-balanse-terracotta/10 p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-balanse-terracotta">
              Special announcement
            </span>
            <h3 className="mt-2 font-heading text-base font-bold text-balanse-ink">
              Movement Expo — March 15
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-balanse-ink/70">
              Handstand foundations, mobility labs, and community flow at Capitol Centrum.
            </p>
            <button
              type="button"
              className="mt-3 w-full rounded-xl bg-balanse-terracotta py-2 text-xs font-semibold text-white transition-colors hover:bg-balanse-sage"
            >
              Reserve spot
            </button>
          </div>

          <div className="rounded-2xl border border-balanse-clay bg-balanse-cream p-4">
            <h3 className="text-sm font-semibold text-balanse-ink">Today&apos;s schedule</h3>
            <ul className="mt-3 space-y-3">
              {upcomingClasses.map((cls) => (
                <li
                  key={cls.name}
                  className="rounded-xl border border-balanse-clay bg-balanse-cream p-3"
                >
                  <p className="text-sm font-medium text-balanse-ink">{cls.name}</p>
                  <p className="text-xs text-balanse-ink/60">{cls.time}</p>
                  <span className="mt-1 inline-block text-[10px] font-semibold uppercase text-balanse-sage">
                    {cls.track}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-balanse-clay bg-balanse-cream p-4">
            <h3 className="text-sm font-semibold text-balanse-ink">Members to connect with</h3>
            <ul className="mt-3 space-y-3">
              {suggestedMembers.map((member) => (
                <li key={member.name} className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-balanse-clay text-xs font-bold text-balanse-sage">
                    {member.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-balanse-ink">{member.name}</p>
                    <p className="truncate text-xs text-balanse-ink/60">{member.focus}</p>
                  </div>
                  <button
                    type="button"
                    className="shrink-0 rounded-full border border-balanse-sage px-3 py-1 text-xs font-semibold text-balanse-sage transition-colors hover:bg-balanse-sage hover:text-white"
                  >
                    Connect
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <div className="pb-6 text-center lg:hidden">
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-xl border border-balanse-clay px-6 py-2 text-sm font-medium text-balanse-ink/70"
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
