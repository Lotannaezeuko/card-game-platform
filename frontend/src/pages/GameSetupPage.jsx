import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import TopBar from '../components/layout/TopBar';
import BottomNav from '../components/layout/BottomNav';

export default function GameSetupPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('host'); // 'host' | 'join'

  // Host form state
  const [decks, setDecks] = useState([]);
  const [deckId, setDeckId] = useState('');
  const [handSize, setHandSize] = useState(5);
  const [turnDirection, setTurnDirection] = useState('clockwise');
  const [dealMethod, setDealMethod] = useState('full_hand_at_start');

  // Join form state
  const [gameCode, setGameCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch('/decks')
      .then((data) => setDecks(data.decks || []))
      .catch(() => setError('Failed to load decks'));
  }, []);

  async function handleHost(e) {
    e.preventDefault();
    if (!deckId) return setError('Please select a deck');
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch('/games', {
        method: 'POST',
        body: {
          deck_id: parseInt(deckId),
          starting_hand_size: handSize,
          turn_direction: turnDirection,
          deal_method: dealMethod,
          is_online: true,
        },
      });
      navigate(`/games/${data.game.game_id}/lobby`);
    } catch (err) {
      setError(err.message || 'Failed to create game');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    const code = gameCode.trim().toUpperCase();
    if (!code) return setError('Please enter a game code');
    setError('');
    setLoading(true);
    try {
      const data = await apiFetch('/games/join', {
        method: 'POST',
        body: { game_code: code },
      });
      navigate(`/games/${data.game.game_id}/lobby`);
    } catch (err) {
      setError(err.message || 'Failed to join game');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <TopBar title="Games" />

      <div className="p-4 max-w-md mx-auto">
        {/* Tab switcher */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-6">
          <button
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === 'host' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'
            }`}
            onClick={() => { setTab('host'); setError(''); }}
          >
            Host a Game
          </button>
          <button
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              tab === 'join' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600'
            }`}
            onClick={() => { setTab('join'); setError(''); }}
          >
            Join a Game
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        {tab === 'host' ? (
          <form onSubmit={handleHost} className="space-y-5">
            {/* Deck */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deck</label>
              <select
                value={deckId}
                onChange={(e) => setDeckId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select a deck…</option>
                {decks.map((d) => (
                  <option key={d.deck_id} value={d.deck_id}>{d.deck_name}</option>
                ))}
              </select>
            </div>

            {/* Hand size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Starting hand size: <span className="font-bold text-indigo-600">{handSize}</span>
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setHandSize((v) => Math.max(1, v - 1))}
                  className="w-10 h-10 rounded-full border border-gray-300 text-lg font-bold text-gray-600 flex items-center justify-center"
                >−</button>
                <div className="flex-1 h-2 bg-gray-200 rounded-full">
                  <div
                    className="h-2 bg-indigo-500 rounded-full transition-all"
                    style={{ width: `${Math.min((handSize / 15) * 100, 100)}%` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setHandSize((v) => Math.min(15, v + 1))}
                  className="w-10 h-10 rounded-full border border-gray-300 text-lg font-bold text-gray-600 flex items-center justify-center"
                >+</button>
              </div>
            </div>

            {/* Turn direction */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Turn direction</label>
              <select
                value={turnDirection}
                onChange={(e) => setTurnDirection(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="clockwise">Clockwise</option>
                <option value="counterclockwise">Counterclockwise</option>
              </select>
            </div>

            {/* Deal method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deal method</label>
              <select
                value={dealMethod}
                onChange={(e) => setDealMethod(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="full_hand_at_start">Full hand at start</option>
                <option value="one_at_a_time">One at a time</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl disabled:opacity-50"
            >
              {loading ? 'Creating…' : 'Create Game'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Game code</label>
              <input
                type="text"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="e.g. ABC123"
                maxLength={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm tracking-widest uppercase font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-400">6-character code from the host</p>
            </div>

            <button
              type="submit"
              disabled={loading || gameCode.length < 6}
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl disabled:opacity-50"
            >
              {loading ? 'Joining…' : 'Join Game'}
            </button>
          </form>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
