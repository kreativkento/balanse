import { Link } from 'react-router-dom'

interface NavbarProps {
  variant?: 'landing' | 'auth'
}

export default function Navbar({ variant = 'landing' }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-balanse-clay bg-balanse-cream/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="group flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-balanse-sage text-sm font-bold text-white">
            B
          </span>
          <span className="font-heading text-xl font-bold tracking-tight text-balanse-ink group-hover:text-balanse-sage transition-colors">
            Balansé
          </span>
        </Link>

        {variant === 'landing' ? (
          <nav className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-balanse-ink transition-colors hover:text-balanse-sage"
            >
              Log in
            </Link>
            <Link
              to="/signup"
              className="rounded-xl bg-balanse-ink px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-balanse-sage"
            >
              Sign up
            </Link>
          </nav>
        ) : (
          <Link
            to="/"
            className="text-sm font-medium text-balanse-sage transition-colors hover:text-balanse-terracotta"
          >
            ← Back to home
          </Link>
        )}
      </div>
    </header>
  )
}
