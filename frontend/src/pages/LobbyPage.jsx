import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import TopBar from '../components/layout/TopBar';
import PlayerChip from '../components/game/PlayerChip';

export default function LobbyPage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();

  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [connectedIds, setConnectedIds] = useState(new Set());

  const gameCodeRef = useRef(null);
  const navigateRef = useRef(navigate);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  // Load game data — redirect immediately if already active
  useEffect(() => {
    apiFetch(`/games/${gameId}`)
      .then((data) => {
        if (data.game.status === 'active') {
          navigate(`/games/${gameId}/play`, { replace: true });
          return;
        }
        setGame(data.game);
        setPlayers(data.players);
        setIsHost(data.game.host_user_id === user?.userId);
        const already = new Set(
          data.players.filter((p) => p.is_connected).map((p) => p.user_id)
        );
        setConnectedIds(already);
        gameCodeRef.current = data.game.game_code;
      })
      .catch(() => setError('Failed to load game'));
  }, [gameId, user]); // intentionally omitting navigate — stable ref used

  // Socket: join room + bind events
  useEffect(() => {
    if (!socket || !game) return;

    socket.emit('join_game', { game_code: game.game_code });

    // Server confirms join — also tells us current status
    socket.on('joined_game', ({ game_code, status }) => {
      if (game_code !== game.game_code) return;
      setConnectedIds((prev) => new Set([...prev, user.userId]));
      // If game already started when we joined (e.g. late joiner), go straight to play
      if (status === 'active') {
        navigateRef.current(`/games/${gameId}/play`, { replace: true });
      }
    });

    socket.on('player_connected', ({ user_id }) => {
      setConnectedIds((prev) => new Set([...prev, user_id]));
    });

    socket.on('player_disconnected', ({ user_id }) => {
      setConnectedIds((prev) => {
        const next = new Set(prev);
        next.delete(user_id);
        return next;
      });
    });

    socket.on('player_joined', ({ user_id, username, player_position }) => {
      setPlayers((prev) => {
        if (prev.some((p) => p.user_id === user_id)) return prev;
        return [...prev, { user_id, username, player_position, is_connected: false }];
      });
    });

    socket.on('player_left', ({ user_id }) => {
      setPlayers((prev) => prev.filter((p) => p.user_id !== user_id));
    });

    socket.on('game_started', () => {
      navigateRef.current(`/games/${gameId}/play`, {
        replace: true,
        state: { game_code: game.game_code },
      });
    });

    // Show socket-level errors (e.g. join_game rejected)
    socket.on('error', ({ message }) => {
      setError(message || 'Socket error');
    });

    return () => {
      socket.emit('leave_game', { game_code: game.game_code });
      socket.off('joined_game');
      socket.off('player_connected');
      socket.off('player_disconnected');
      socket.off('player_joined');
      socket.off('player_left');
      socket.off('game_started');
      socket.off('error');
    };
  }, [socket, game]); // stable deps only — navigate via ref, gameId/user don't change

  async function handleStartGame() {
    setError('');
    setStarting(true);
    try {
      await apiFetch(`/games/${gameId}/deal`, { method: 'POST' });
      navigate(`/games/${gameId}/play`, {
        replace: true,
        state: { game_code: game.game_code },
      });
    } catch (err) {
      setError(err.message || 'Failed to start game');
      setStarting(false);
    }
  }

  function copyCode() {
    if (game?.game_code) navigator.clipboard.writeText(game.game_code);
  }

  if (error && !game) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600 px-4">{error}</div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar title="Lobby" />

      <div className="p-4 max-w-md mx-auto space-y-6">
        {/* Game code */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center shadow-sm">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">Game code</p>
          <p className="text-5xl font-black tracking-widest text-indigo-600 font-mono">
            {game.game_code}
          </p>
          <button
            onClick={copyCode}
            className="mt-3 text-xs text-gray-400 underline underline-offset-2"
          >
            Tap to copy
          </button>
          <p className="mt-3 text-sm text-gray-500">
            Share this code with friends to let them join
          </p>
        </div>

        {/* Players */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-3">
            Players ({players.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {players.map((p) => (
              <PlayerChip
                key={p.user_id}
                username={p.username + (p.user_id === game.host_user_id ? ' (host)' : '')}
                isConnected={connectedIds.has(p.user_id)}
              />
            ))}
            {players.length === 0 && (
              <p className="text-sm text-gray-400">No players yet…</p>
            )}
          </div>
        </div>

        {/* Status / actions */}
        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        {isHost ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 text-center">
              Start the game when all players have joined.
            </p>
            <button
              onClick={handleStartGame}
              disabled={starting || players.length < 1}
              className="w-full py-3.5 bg-indigo-600 text-white font-semibold rounded-xl disabled:opacity-50 text-base"
            >
              {starting ? 'Starting…' : 'Start Game'}
            </button>
          </div>
        ) : (
          <div className="text-center py-4 space-y-3">
            <div className="inline-flex items-center gap-2 text-gray-500 text-sm">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              Waiting for the host to start…
            </div>
            <div>
              <button
                onClick={() => navigate(`/games/${gameId}/play`, { replace: true })}
                className="text-xs text-gray-400 underline underline-offset-2"
              >
                Game already started? Tap here
              </button>
            </div>
          </div>
        )}

        {/* Deck info */}
        <div className="text-center text-xs text-gray-400 space-y-0.5">
          <p>Deck: <span className="font-medium text-gray-500">{game.deck_name}</span></p>
          <p>Hand size: <span className="font-medium text-gray-500">{game.starting_hand_size}</span> · Turn: <span className="font-medium text-gray-500">{game.turn_direction}</span></p>
        </div>
      </div>
    </div>
  );
}
