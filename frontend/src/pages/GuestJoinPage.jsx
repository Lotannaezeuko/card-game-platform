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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-1">Card Game Platform</h1>
        <p className="text-gray-500 text-center text-sm mb-8">Join a Game</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="game_code" className="block text-sm font-medium text-gray-700 mb-1">
              Game Code
            </label>
            <input
              id="game_code"
              type="text"
              required
              value={form.game_code}
              onChange={(e) => setForm({ ...form, game_code: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter game code"
            />
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Your Name
            </label>
            <input
              id="username"
              type="text"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your name"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
          >
            {loading ? 'Joining…' : 'Join Game'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Have an account?{' '}
          <Link to="/login" className="text-blue-600 font-medium hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
