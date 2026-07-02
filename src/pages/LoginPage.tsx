import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const success = login(email, password)
    if (success) {
      navigate('/dashboard')
    } else {
      setError('Please enter a valid email and password.')
    }
  }

  return (
    <div className="min-h-screen bg-balanse-cream">
      <Navbar variant="auth" />

      <div className="mx-auto flex max-w-md flex-col px-6 py-16">
        <div className="rounded-2xl border border-balanse-clay bg-white/60 p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-balanse-ink">Welcome back</h1>
          <p className="mt-2 text-sm text-balanse-ink/70">
            Log in to access your member dashboard, schedule, and community.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div className="rounded-xl border border-balanse-terracotta/30 bg-balanse-terracotta/10 px-4 py-3 text-sm text-balanse-terracotta">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-balanse-ink">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1.5 w-full rounded-xl border border-balanse-clay bg-balanse-cream px-4 py-3 text-sm outline-none transition-colors focus:border-balanse-sage focus:ring-2 focus:ring-balanse-sage/20"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-balanse-ink">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 w-full rounded-xl border border-balanse-clay bg-balanse-cream px-4 py-3 text-sm outline-none transition-colors focus:border-balanse-sage focus:ring-2 focus:ring-balanse-sage/20"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-balanse-ink py-3.5 text-sm font-semibold text-white transition-colors hover:bg-balanse-sage"
            >
              Log in
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-balanse-ink/70">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="font-semibold text-balanse-sage hover:text-balanse-terracotta">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
