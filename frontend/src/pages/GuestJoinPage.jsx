import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';

export default function GuestJoinPage() {
  const { loginAsGuest } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', game_code: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Two-step flow: create guest token first, then join the game as a player
      const data = await apiFetch('/auth/guest', { method: 'POST', body: form });
      loginAsGuest(data.token);

      // Join the game as a player (no user_id — anonymous guest)
      const joinData = await apiFetch(`/games/${data.guest.gameId}/players`, { method: 'POST', body: {} });

      // Store guest's game_player_id for socket identification
      sessionStorage.setItem('guest_game_player_id', joinData.player.game_player_id);

      navigate(`/games/${data.guest.gameId}/lobby`);
    } catch (err) {
      setError(err.message || 'Failed to join game');
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
          <p className="text-textMuted text-center text-sm mt-1">Join a Game</p>
        </div>

        <div className="panel p-7">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="game_code" className="block text-sm font-medium text-textMuted mb-1.5">
                Game Code
              </label>
              <input
                id="game_code"
                type="text"
                required
                value={form.game_code}
                onChange={(e) => setForm({ ...form, game_code: e.target.value })}
                className="field px-3 py-3 text-sm uppercase tracking-widest font-mono"
                placeholder="Enter game code"
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-textMuted mb-1.5">
                Your Name
              </label>
              <input
                id="username"
                type="text"
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="field px-3 py-3 text-sm"
                placeholder="Enter your name"
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
              {loading ? 'Joining…' : 'Join Game'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-textMuted mt-6">
          Have an account?{' '}
          <Link to="/login" className="text-accent font-semibold hover:underline">
            Log in
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
