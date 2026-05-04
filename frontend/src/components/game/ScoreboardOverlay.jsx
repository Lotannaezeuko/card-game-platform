import { useState, useEffect } from 'react';
import { apiFetch } from '../../api';

// Overlay showing live scores for all players.
// Hosts get editable score inputs; non-hosts see read-only values.
export default function ScoreboardOverlay({ gameId, isHost, onClose }) {
  const [scores, setScores] = useState([]);
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch(`/games/${gameId}/scores`)
      .then((data) => {
        setScores(data.scores || []);
        const initial = {};
        (data.scores || []).forEach((p) => {
          initial[p.user_id] = p.score;
        });
        setEdits(initial);
      })
      .catch(() => setError('Failed to load scores'));
  }, [gameId]);

  async function handleSave() {
    setError('');
    setSaving(true);
    try {
      await Promise.all(
        scores.map((p) =>
          apiFetch(`/games/${gameId}/score`, {
            method: 'PUT',
            body: { user_id: p.user_id, score: Number(edits[p.user_id] ?? p.score) },
          })
        )
      );
      onClose();
    } catch {
      setError('Failed to save scores');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-white rounded-2xl shadow-xl w-80 max-w-full mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Scoreboard</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-5 py-3 space-y-3 max-h-72 overflow-y-auto">
          {scores.length === 0 && !error && (
            <p className="text-sm text-gray-400 text-center py-4">Loading…</p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {scores.map((p, i) => (
            <div key={p.user_id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-gray-400 w-4 text-right">{i + 1}.</span>
                <span className="text-sm font-medium text-gray-800 truncate">{p.username}</span>
              </div>
              {isHost ? (
                <input
                  type="number"
                  value={edits[p.user_id] ?? p.score}
                  onChange={(e) => setEdits((prev) => ({ ...prev, [p.user_id]: e.target.value }))}
                  className="w-16 text-right border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              ) : (
                <span className="text-sm font-bold text-indigo-600">{p.score}</span>
              )}
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 rounded-xl text-sm text-gray-600 font-medium"
          >
            {isHost ? 'Cancel' : 'Close'}
          </button>
          {isHost && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Update Scores'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
