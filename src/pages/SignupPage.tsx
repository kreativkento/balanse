import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'

export default function SignupPage() {
  const { signup, user } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    const success = signup(name, email, password)
    if (success) {
      navigate('/dashboard')
    } else {
      setError('Please fill in all fields correctly.')
    }
  }

  return (
    <div className="min-h-screen bg-balanse-cream">
      <Navbar variant="auth" />

      <div className="mx-auto flex max-w-md flex-col px-6 py-16">
        <div className="rounded-2xl border border-balanse-clay bg-white/60 p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-balanse-ink">Join Balansé</h1>
          <p className="mt-2 text-sm text-balanse-ink/70">
            Create your account to book classes, track progress, and connect with the
            community.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {error && (
              <div className="rounded-xl border border-balanse-terracotta/30 bg-balanse-terracotta/10 px-4 py-3 text-sm text-balanse-terracotta">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-balanse-ink">
                Full name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="mt-1.5 w-full rounded-xl border border-balanse-clay bg-balanse-cream px-4 py-3 text-sm outline-none transition-colors focus:border-balanse-sage focus:ring-2 focus:ring-balanse-sage/20"
                required
              />
            </div>

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
                placeholder="At least 6 characters"
                className="mt-1.5 w-full rounded-xl border border-balanse-clay bg-balanse-cream px-4 py-3 text-sm outline-none transition-colors focus:border-balanse-sage focus:ring-2 focus:ring-balanse-sage/20"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-balanse-ink py-3.5 text-sm font-semibold text-white transition-colors hover:bg-balanse-sage"
            >
              Create account
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-balanse-ink/70">
            Already a member?{' '}
            <Link to="/login" className="font-semibold text-balanse-sage hover:text-balanse-terracotta">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
