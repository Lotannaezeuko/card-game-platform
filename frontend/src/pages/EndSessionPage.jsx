import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function EndSessionPage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [scores, setScores] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [alreadyEnded, setAlreadyEnded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch(`/games/${gameId}/scores`),
      apiFetch(`/games/${gameId}`),
    ])
      .then(([scoresData, gameData]) => {
        setScores(scoresData.scores || []);
        setIsHost(gameData.game.host_user_id === user?.userId);
        setAlreadyEnded(gameData.game.status === 'ended');
      })
      .catch(() => setError('Failed to load results'))
      .finally(() => setLoading(false));
  }, [gameId, user]);

  async function handleCloseSession() {
    setEnding(true);
    try {
      await apiFetch(`/games/${gameId}/session/end`, { method: 'PUT' });
    } catch {
      // Silently ignore: game may already be ended (e.g. host refreshed after ending)
    }
    navigate('/home');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <span className="text-textMuted">Loading results…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏆</div>
          <h1 className="text-2xl font-black text-text">Game Over</h1>
          <p className="text-sm text-textMuted mt-1">Final scores</p>
        </div>

        {/* Scores list */}
        <div className="panel overflow-hidden mb-6">
          {error && (
            <p className="text-sm text-error text-center px-5 py-4">{error}</p>
          )}
          {scores.length === 0 && !error && (
            <p className="text-sm text-textMuted text-center px-5 py-4">No scores recorded</p>
          )}
          {scores.map((p, i) => (
            <div
              key={p.user_id}
              className={`flex items-center justify-between px-5 py-3.5 ${
                i < scores.length - 1 ? 'border-b border-border' : ''
              } ${p.user_id === user?.userId ? 'bg-accentMuted' : ''}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl w-6 text-center">
                  {MEDALS[i] || <span className="text-sm text-textMuted">{i + 1}</span>}
                </span>
                <span className={`text-sm font-medium ${
                  p.user_id === user?.userId ? 'text-accent' : 'text-text'
                }`}>
                  {p.username}
                  {p.user_id === user?.userId && (
                    <span className="ml-1.5 text-xs text-accent/70">(you)</span>
                  )}
                </span>
              </div>
              <span className="text-lg font-bold text-text">{p.score}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {isHost && !alreadyEnded && (
            <button
              onClick={handleCloseSession}
              disabled={ending}
              className="btn-primary w-full py-3"
            >
              {ending ? 'Closing…' : 'Close Session'}
            </button>
          )}
          <button
            onClick={() => navigate('/home')}
            className="btn-secondary w-full py-3"
          >
            Return Home
          </button>
        </div>
      </div>
    </div>
  );
}
