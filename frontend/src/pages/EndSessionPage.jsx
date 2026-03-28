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
      // might already be ended — still navigate home
    }
    navigate('/home');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <span className="text-gray-400">Loading results…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏆</div>
          <h1 className="text-2xl font-black text-gray-900">Game Over</h1>
          <p className="text-sm text-gray-500 mt-1">Final scores</p>
        </div>

        {/* Scores list */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
          {error && (
            <p className="text-sm text-red-600 text-center px-5 py-4">{error}</p>
          )}
          {scores.length === 0 && !error && (
            <p className="text-sm text-gray-400 text-center px-5 py-4">No scores recorded</p>
          )}
          {scores.map((p, i) => (
            <div
              key={p.user_id}
              className={`flex items-center justify-between px-5 py-3.5 ${
                i < scores.length - 1 ? 'border-b border-gray-100' : ''
              } ${p.user_id === user?.userId ? 'bg-indigo-50' : ''}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl w-6 text-center">
                  {MEDALS[i] || <span className="text-sm text-gray-400">{i + 1}</span>}
                </span>
                <span className={`text-sm font-medium ${
                  p.user_id === user?.userId ? 'text-indigo-700' : 'text-gray-800'
                }`}>
                  {p.username}
                  {p.user_id === user?.userId && (
                    <span className="ml-1.5 text-xs text-indigo-400">(you)</span>
                  )}
                </span>
              </div>
              <span className="text-lg font-bold text-gray-900">{p.score}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {isHost && !alreadyEnded && (
            <button
              onClick={handleCloseSession}
              disabled={ending}
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl disabled:opacity-50"
            >
              {ending ? 'Closing…' : 'Close Session'}
            </button>
          )}
          <button
            onClick={() => navigate('/home')}
            className="w-full py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl"
          >
            Return Home
          </button>
        </div>
      </div>
    </div>
  );
}
