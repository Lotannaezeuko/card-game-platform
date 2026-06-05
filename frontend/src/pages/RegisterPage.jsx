import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: { username: form.username, email: form.email, password: form.password },
      });
      login(data.token);
      navigate('/home');
    } catch (err) {
      if (err.status === 409) {
        setError('Username or email is already taken');
      } else {
        setError(err.message);
      }
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
          <p className="text-textMuted text-center text-sm mt-1">Create your account</p>
        </div>

        <div className="panel p-7">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-textMuted mb-1.5">
                Username
              </label>
              <input
                id="username"
                type="text"
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="field px-3 py-3 text-sm"
                placeholder="coolplayer"
              />
            </div>

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

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-textMuted mb-1.5">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
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
              {loading ? 'Creating account…' : 'Register'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-textMuted mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-accent font-semibold hover:underline">
            Log In
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
