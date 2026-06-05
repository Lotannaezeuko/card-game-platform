import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiFetch } from '../api';
import TopBar from '../components/layout/TopBar';
import BottomNav from '../components/layout/BottomNav';

export default function GameSetupPage() {
  const navigate = useNavigate();
  const { state: navState } = useLocation();
  const [tab, setTab] = useState(navState?.tab === 'join' ? 'join' : 'host'); // 'host' | 'join'

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
      .then((data) => {
        const loaded = data.decks || [];
        setDecks(loaded);
        // Pre-select deck when arriving from the HomePage "jump back in" shortcut
        if (navState?.deck_id) {
          const match = loaded.find((d) => d.deck_id === navState.deck_id);
          if (match) setDeckId(String(match.deck_id));
        }
      })
      .catch(() => setError('Failed to load decks'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    <div className="min-h-screen bg-bg" style={{ paddingBottom: 'calc(var(--nav-height) + 1rem)' }}>
      <TopBar title="Games" />

      <div className="p-4 max-w-md mx-auto">
        {/* Tab switcher */}
        <div className="flex rounded-md overflow-hidden border border-border mb-6">
          <button
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
              tab === 'host' ? 'bg-accent text-black' : 'bg-surface2 text-textMuted'
            }`}
            onClick={() => { setTab('host'); setError(''); }}
          >
            Host a Game
          </button>
          <button
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${
              tab === 'join' ? 'bg-accent text-black' : 'bg-surface2 text-textMuted'
            }`}
            onClick={() => { setTab('join'); setError(''); }}
          >
            Join a Game
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-error/15 text-error rounded-lg text-sm">{error}</div>
        )}

        {tab === 'host' ? (
          <form onSubmit={handleHost} className="space-y-5">
            {/* Deck */}
            <div>
              <label className="block text-sm font-medium text-textMuted mb-1">Deck</label>
              <select
                value={deckId}
                onChange={(e) => setDeckId(e.target.value)}
                className="field px-3 py-2.5 text-sm"
              >
                <option value="">Select a deck…</option>
                {decks.map((d) => (
                  <option key={d.deck_id} value={d.deck_id}>{d.deck_name}</option>
                ))}
              </select>
            </div>

            {/* Hand size */}
            <div>
              <label className="block text-sm font-medium text-textMuted mb-1">
                Starting hand size: <span className="font-bold text-accent">{handSize}</span>
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setHandSize((v) => Math.max(0, v - 1))}
                  className="w-10 h-10 rounded-full border border-border text-lg font-bold text-text flex items-center justify-center hover:bg-surface3"
                >−</button>
                <div className="flex-1 h-2 bg-surface3 rounded-full">
                  <div
                    className="h-2 bg-accent rounded-full transition-all"
                    style={{ width: `${Math.min((handSize / 15) * 100, 100)}%` }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setHandSize((v) => Math.min(15, v + 1))}
                  className="w-10 h-10 rounded-full border border-border text-lg font-bold text-text flex items-center justify-center hover:bg-surface3"
                >+</button>
              </div>
            </div>

            {/* Turn direction */}
            <div>
              <label className="block text-sm font-medium text-textMuted mb-1">Turn direction</label>
              <select
                value={turnDirection}
                onChange={(e) => setTurnDirection(e.target.value)}
                className="field px-3 py-2.5 text-sm"
              >
                <option value="clockwise">Clockwise</option>
                <option value="counterclockwise">Counterclockwise</option>
              </select>
            </div>

            {/* Deal method */}
            <div>
              <label className="block text-sm font-medium text-textMuted mb-1">Deal method</label>
              <select
                value={dealMethod}
                onChange={(e) => setDealMethod(e.target.value)}
                className="field px-3 py-2.5 text-sm"
              >
                <option value="full_hand_at_start">Full hand at start</option>
                <option value="one_at_a_time">One at a time</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3"
            >
              {loading ? 'Creating…' : 'Create Game'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-textMuted mb-1">Game code</label>
              <input
                type="text"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="e.g. ABC123"
                maxLength={6}
                className="field px-3 py-2.5 text-sm tracking-widest uppercase font-mono"
              />
              <p className="mt-1 text-xs text-textFaint">6-character code from the host</p>
            </div>

            <button
              type="submit"
              disabled={loading || gameCode.length < 6}
              className="btn-primary w-full py-3"
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
