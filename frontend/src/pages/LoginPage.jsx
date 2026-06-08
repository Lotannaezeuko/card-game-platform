import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, token, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Already signed in? Skip the form and go straight to the app.
  if (!authLoading && token) {
    return <Navigate to="/home" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch('/auth/login', { method: 'POST', body: form });
      login(data.token);
      navigate('/home');
    } catch (err) {
      setError(err.status === 401 ? 'Invalid email or password' : err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <BrandMark />
          <h1 className="text-2xl font-bold text-text text-center mt-4">Wildcard</h1>
          <p className="text-textMuted text-center text-sm mt-1">Sign in to your account</p>
        </div>

        <div className="panel p-7">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-textMuted mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="field px-3 py-3 text-sm"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-textMuted mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="field px-3 py-3 text-sm"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-error text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-sm mt-2"
            >
              {loading ? 'Signing in…' : 'Log In'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-textMuted mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-accent font-semibold hover:underline">
            Register
          </Link>
        </p>
        <p className="text-center text-sm text-textFaint mt-2">
          <Link to="/join" className="text-accent/80 hover:underline">
            Join a game as a guest
          </Link>
        </p>
      </div>
    </div>
  );
}

// Subtle card-stack brand mark shown above the auth forms
function BrandMark() {
  return (
    <div className="relative w-14 h-14">
      <div className="absolute inset-0 rounded-lg bg-surface3 border border-border rotate-[-8deg]" />
      <div className="absolute inset-0 rounded-lg bg-surface2 border border-borderAccent rotate-[6deg] flex items-center justify-center">
        <span className="text-accent text-2xl font-black">W</span>
      </div>
    </div>
  );
}
