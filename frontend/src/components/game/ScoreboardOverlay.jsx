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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="panel shadow-lg w-80 max-w-full overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-bold text-text">Scoreboard</h2>
          <button onClick={onClose} className="text-textMuted hover:text-text text-xl leading-none">×</button>
        </div>

        <div className="px-5 py-3 space-y-3 max-h-72 overflow-y-auto">
          {scores.length === 0 && !error && (
            <p className="text-sm text-textMuted text-center py-4">Loading…</p>
          )}
          {error && <p className="text-sm text-error">{error}</p>}
          {scores.map((p, i) => (
            <div key={p.user_id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-textMuted w-4 text-right">{i + 1}.</span>
                <span className="text-sm font-medium text-text truncate">{p.username}</span>
              </div>
              {isHost ? (
                <input
                  type="number"
                  value={edits[p.user_id] ?? p.score}
                  onChange={(e) => setEdits((prev) => ({ ...prev, [p.user_id]: e.target.value }))}
                  className="field w-16 text-right px-2 py-1 text-sm"
                />
              ) : (
                <span className="text-sm font-bold text-accent">{p.score}</span>
              )}
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-border flex gap-2">
          <button
            onClick={onClose}
            className="btn-secondary flex-1 py-2 text-sm"
          >
            {isHost ? 'Cancel' : 'Close'}
          </button>
          {isHost && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex-1 py-2 text-sm"
            >
              {saving ? 'Saving…' : 'Update Scores'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
