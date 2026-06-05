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
  const [connectedPlayerIds, setConnectedPlayerIds] = useState(new Set());
  const [copied, setCopied] = useState(false);

  const gameCodeRef = useRef(null);
  const navigateRef = useRef(navigate);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);

  // Load game data. Redirect immediately if the game is already active so
  // players who refresh mid-game land on the play page instead of the lobby.
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
          data.players.filter((p) => p.is_connected).map((p) => p.game_player_id)
        );
        setConnectedPlayerIds(already);
        gameCodeRef.current = data.game.game_code;
      })
      .catch((err) => setError(err.message || 'Failed to load game'));
  }, [gameId, user]); // intentionally omitting navigate — stable ref used

  // Join the socket room and listen for lobby events.
  // navigate is accessed via a ref so this effect never re-runs when navigate changes.
  useEffect(() => {
    if (!socket || !game) return;

    socket.emit('join_game', { game_code: game.game_code });

    socket.on('joined_game', ({ game_code, status, player_position }) => {
      if (game_code !== game.game_code) return;
      setPlayers((prev) => {
        const me = prev.find((p) =>
          user?.isGuest ? p.user_id === null : p.user_id === user?.userId
        );
        if (me) setConnectedPlayerIds((s) => new Set([...s, me.game_player_id]));
        return prev;
      });
      // Late joiners (e.g. joining mid-game via code) go straight to the play page
      if (status === 'active') {
        navigateRef.current(`/games/${gameId}/play`, { replace: true });
      }
    });

    socket.on('player_connected', ({ game_player_id }) => {
      setConnectedPlayerIds((prev) => new Set([...prev, game_player_id]));
    });

    socket.on('player_disconnected', ({ game_player_id }) => {
      setConnectedPlayerIds((prev) => {
        const next = new Set(prev);
        next.delete(game_player_id);
        return next;
      });
    });

    socket.on('player_joined', ({ user_id, game_player_id, username, player_position }) => {
      setPlayers((prev) => {
        if (game_player_id && prev.some((p) => p.game_player_id === game_player_id)) return prev;
        if (user_id && prev.some((p) => p.user_id === user_id)) return prev;
        return [...prev, { user_id, game_player_id, username, player_position, is_connected: false }];
      });
    });

    socket.on('player_left', ({ user_id, game_player_id }) => {
      setPlayers((prev) => prev.filter((p) =>
        game_player_id ? p.game_player_id !== game_player_id : p.user_id !== user_id
      ));
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

  function handleCopy() {
    if (!game?.game_code) return;
    navigator.clipboard.writeText(game.game_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (error && !game) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center text-error px-4">{error}</div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center text-textMuted">Loading…</div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <TopBar title="Lobby" />

      <div className="p-4 max-w-md mx-auto space-y-6">
        {/* Game code */}
        <div className="panel p-5 text-center">
          <p className="text-xs uppercase tracking-widest text-textMuted mb-2">Game code</p>
          <p className="text-5xl font-black tracking-widest text-accent font-mono break-all">
            {game.game_code}
          </p>
          <button
            onClick={handleCopy}
            className="btn-secondary mt-4 px-4 py-2 text-xs"
          >
            {copied ? 'Copied!' : 'Tap to copy'}
          </button>
          <p className="mt-3 text-sm text-textMuted">
            Share this code with friends to let them join
          </p>
        </div>

        {/* Players */}
        <div className="panel p-4">
          <p className="text-sm font-semibold text-text mb-3">
            Players ({players.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {players.map((p) => (
              <PlayerChip
                key={p.game_player_id}
                username={(p.username || 'Guest') + (p.user_id === game.host_user_id ? ' (host)' : '')}
                isConnected={connectedPlayerIds.has(p.game_player_id)}
              />
            ))}
            {players.length === 0 && (
              <p className="text-sm text-textMuted">No players yet…</p>
            )}
          </div>
        </div>

        {/* Status / actions */}
        {error && (
          <div className="p-3 bg-error/15 text-error rounded-lg text-sm">{error}</div>
        )}

        {isHost ? (
          <div className="space-y-3">
            <p className="text-sm text-textMuted text-center">
              Start the game when all players have joined.
            </p>
            <button
              onClick={handleStartGame}
              disabled={starting || players.length < 1}
              className="btn-primary w-full py-3.5 text-base"
            >
              {starting ? 'Starting…' : 'Start Game'}
            </button>
          </div>
        ) : (
          <div className="text-center py-4 space-y-3">
            <div className="inline-flex items-center gap-2 text-textMuted text-sm">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Waiting for the host to start…
            </div>
            <div>
              <button
                onClick={() => navigate(`/games/${gameId}/play`, { replace: true })}
                className="text-xs text-textFaint underline underline-offset-2"
              >
                Game already started? Tap here
              </button>
            </div>
          </div>
        )}

        {/* Deck info */}
        <div className="text-center text-xs text-textFaint space-y-0.5">
          <p>Deck: <span className="font-medium text-textMuted">{game.deck_name}</span></p>
          <p>Hand size: <span className="font-medium text-textMuted">{game.starting_hand_size}</span> · Turn: <span className="font-medium text-textMuted">{game.turn_direction}</span></p>
        </div>
      </div>

      {/* Clipboard toast */}
      {copied && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(var(--nav-height) + 16px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--color-success)',
          color: '#000',
          padding: '10px 24px',
          borderRadius: 'var(--radius-full)',
          fontWeight: '600',
          fontSize: 'var(--text-sm)',
          zIndex: 1000,
          boxShadow: 'var(--shadow-md)',
          whiteSpace: 'nowrap'
        }}>
          Code copied!
        </div>
      )}
    </div>
  );
}
