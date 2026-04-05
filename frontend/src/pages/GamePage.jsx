import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import PlayerChip from '../components/game/PlayerChip';
import DiscardPile, { DrawPileCard } from '../components/game/DiscardPile';
import HandRow from '../components/game/HandRow';
import ScoreboardOverlay from '../components/game/ScoreboardOverlay';
import ToastContainer, { useToasts } from '../components/ui/Toast';
import Modal from '../components/ui/Modal';

export default function GamePage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { state: navState } = useLocation();
  const { user } = useAuth();
  const socket = useSocket();

  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const [hand, setHand] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [discardTop, setDiscardTop] = useState(null);
  const [currentPlayerPos, setCurrentPlayerPos] = useState(1);
  const [isHost, setIsHost] = useState(false);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [showAdjustTurn, setShowAdjustTurn] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [flippedCardId, setFlippedCardId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null); // 'reshuffle' | 'endgame'
  const [hideDiscardPile, setHideDiscardPile] = useState(false);
  const [toasts, addToast] = useToasts();

  // Stable refs so socket handlers always see latest values without re-running the effect
  const playersRef = useRef(players);
  const userRef = useRef(user);
  const navigateRef = useRef(navigate);
  const gameIdRef = useRef(gameId);
  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);
  useEffect(() => { gameIdRef.current = gameId; }, [gameId]);

  // Derived
  const effectivePos = currentPlayerPos === 0 ? 1 : currentPlayerPos;
  const currentPlayer = players.find((p) => p.player_position === effectivePos);
  const isMyTurn = currentPlayer?.user_id === user?.userId;

  // Emit join_game immediately using game_code passed from LobbyPage —
  // this eliminates the timing window between leave_game (LobbyPage cleanup)
  // and the later join_game that fires after the API call below.
  useEffect(() => {
    if (!socket || !navState?.game_code) return;
    socket.emit('join_game', { game_code: navState.game_code });
  }, [socket, navState?.game_code]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load game + hand on mount, then fetch deck settings
  useEffect(() => {
    Promise.all([
      apiFetch(`/games/${gameId}`),
      apiFetch(`/games/${gameId}/hand`),
    ])
      .then(([gameData, handData]) => {
        setGame(gameData.game);
        setPlayers(gameData.players);
        setIsHost(gameData.game.host_user_id === user?.userId);
        setCurrentPlayerPos(gameData.game.current_player_position ?? 1);
        setHand(handData.hand || []);
        setFlippedCardId(null);
        if (gameData.discard_top) setDiscardTop(gameData.discard_top);

        // Fetch deck settings to check hideDiscardPile
        const deckId = gameData.game.deck_id;
        if (deckId) {
          apiFetch(`/decks/${deckId}`)
            .then((deckData) => {
              setHideDiscardPile(deckData.attributes?.hideDiscardPile ?? false);
            })
            .catch(() => {}); // non-critical — silently ignore
        }
      })
      .catch(() => addToast('Failed to load game'));
  }, [gameId, user]);

  // Socket events — deps are [socket, game] only.
  // All mutable values (players, user, navigate, gameId) are read via refs
  // so this effect never re-runs mid-game and never misses an event.
  useEffect(() => {
    if (!socket || !game) return;

    socket.emit('join_game', { game_code: game.game_code });

    socket.on('card_drawn', ({ user_id, username }) => {
      if (user_id !== userRef.current?.userId) addToast(`${username} drew a card`);
    });

    socket.on('card_played', ({ user_id, username, card }) => {
      setDiscardTop(card);
      if (user_id !== userRef.current?.userId) addToast(`${username} played ${card.card_name}`);
    });

    socket.on('turn_passed', ({ current_player_position }) => {
      setCurrentPlayerPos(current_player_position);
      setSelectedCardId(null);
      const next = playersRef.current.find((p) => p.player_position === current_player_position);
      if (next?.user_id === userRef.current?.userId) {
        addToast("It's your turn!");
      } else if (next) {
        addToast(`It's ${next.username}'s turn`);
      }
    });

    socket.on('deck_reshuffled', ({ count }) => {
      addToast(`Deck reshuffled — ${count} cards returned`);
    });

    socket.on('score_updated', ({ user_id, score }) => {
      setPlayers((prev) =>
        prev.map((p) => (p.user_id === user_id ? { ...p, score } : p))
      );
    });

    socket.on('game_ended', () => {
      navigateRef.current(`/games/${gameIdRef.current}/end`, { replace: true });
    });

    socket.on('player_disconnected', ({ username }) => {
      addToast(`${username} disconnected`);
    });

    return () => {
      socket.emit('leave_game', { game_code: game.game_code });
      socket.off('card_drawn');
      socket.off('card_played');
      socket.off('turn_passed');
      socket.off('deck_reshuffled');
      socket.off('score_updated');
      socket.off('game_ended');
      socket.off('player_disconnected');
    };
  }, [socket, game]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ──────────────────────────────────────────────────────
  // Use a ref so handlePlayCard can read the latest hand without being in the dep array
  const handRef = useRef(hand);
  useEffect(() => { handRef.current = hand; }, [hand]);

  const handlePlayCard = useCallback(async () => {
    if (!selectedCardId || actionLoading) return;
    const card = handRef.current.find((c) => c.hand_id === selectedCardId);
    if (!card) return;
    setActionLoading(true);
    try {
      await apiFetch(`/games/${gameId}/play`, {
        method: 'POST',
        body: { hand_id: selectedCardId },
      });
      setHand((prev) => prev.filter((c) => c.hand_id !== selectedCardId));
      setDiscardTop(card); // optimistic — socket event will confirm for everyone else
      setSelectedCardId(null);
      setFlippedCardId(null);
    } catch (err) {
      addToast(err.message || 'Could not play card');
    } finally {
      setActionLoading(false);
    }
  }, [selectedCardId, actionLoading, gameId]);

  const handleDrawCard = useCallback(async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const data = await apiFetch(`/games/${gameId}/draw`, { method: 'POST' });
      // hand_entry has hand_id and card_id but not full card — refetch hand
      const handData = await apiFetch(`/games/${gameId}/hand`);
      setHand(handData.hand || []);
      setFlippedCardId(null);
      addToast('You drew a card');
    } catch (err) {
      addToast(err.message || 'Could not draw card');
    } finally {
      setActionLoading(false);
    }
  }, [actionLoading, gameId]);

  const handlePassTurn = useCallback(async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      await apiFetch(`/games/${gameId}/pass`, { method: 'POST' });
      // UI updates via turn_passed socket event
    } catch (err) {
      addToast(err.message || 'Could not pass turn');
    } finally {
      setActionLoading(false);
    }
  }, [actionLoading, gameId]);

  const handleReshuffle = useCallback(() => {
    setConfirmDialog('reshuffle');
  }, []);

  const confirmReshuffle = useCallback(async () => {
    setConfirmDialog(null);
    try {
      await apiFetch(`/games/${gameId}/reshuffle`, { method: 'POST' });
    } catch (err) {
      addToast(err.message || 'Could not reshuffle');
    }
  }, [gameId]);

  const handleAdjustTurn = useCallback(async (position) => {
    try {
      await apiFetch(`/games/${gameId}/turn`, {
        method: 'PUT',
        body: { player_position: position },
      });
      setShowAdjustTurn(false);
    } catch (err) {
      addToast(err.message || 'Could not adjust turn');
    }
  }, [gameId]);

  const handleEndGame = useCallback(() => {
    setConfirmDialog('endgame');
  }, []);

  const confirmEndGame = useCallback(async () => {
    setConfirmDialog(null);
    try {
      await apiFetch(`/games/${gameId}/session/end`, { method: 'PUT' });
      // Host navigates directly — user 2 navigates via game_ended socket event
      navigate(`/games/${gameId}/end`, { replace: true });
    } catch (err) {
      addToast(err.message || 'Could not end game');
    }
  }, [gameId, navigate]);

  if (!game) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex items-center justify-center">
        <span className="text-slate-400 text-sm">Loading game…</span>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-900 overflow-hidden flex flex-col select-none">

      {/* ── Top strip: players + game code ── */}
      <div className="flex-none h-11 px-3 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          {players.map((p) => (
            <PlayerChip
              key={p.user_id}
              username={p.username}
              isCurrentTurn={p.player_position === effectivePos}
              isConnected={true}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 ml-2 flex-none">
          <span className="text-xs text-slate-500 font-mono tracking-wider">{game.game_code}</span>
          <button
            onClick={() => navigate('/home')}
            className="text-slate-500 hover:text-slate-300 text-lg leading-none"
            title="Leave game"
          >
            ×
          </button>
        </div>
      </div>

      {/* ── Middle: piles + actions ── */}
      <div className="flex-1 flex min-h-0">

        {/* Centre: discard + draw */}
        <div className="flex-1 flex items-center justify-center gap-6">
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-slate-400">Discard</span>
            <DiscardPile card={discardTop} hidden={hideDiscardPile} />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs text-slate-400">Draw</span>
            <DrawPileCard />
          </div>
        </div>

        {/* Right panel: actions */}
        <div className="w-32 flex-none flex flex-col justify-center gap-2 pr-3 py-3">
          {isMyTurn ? (
            <>
              <ActionBtn
                label="Play Card"
                disabled={!selectedCardId || actionLoading}
                onClick={handlePlayCard}
                color="indigo"
              />
              <ActionBtn
                label="Draw Card"
                disabled={actionLoading}
                onClick={handleDrawCard}
                color="emerald"
              />
              <ActionBtn
                label="Pass Turn"
                disabled={actionLoading}
                onClick={handlePassTurn}
                color="amber"
              />
              {selectedCardId && (
                <ActionBtn
                  label="Flip Card"
                  onClick={() =>
                    setFlippedCardId((prev) =>
                      prev === selectedCardId ? null : selectedCardId
                    )
                  }
                  color="slate"
                />
              )}
            </>
          ) : (
            <div className="text-center px-1">
              <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse mx-auto mb-2" />
              <p className="text-xs text-slate-400 leading-snug">
                {currentPlayer ? `${currentPlayer.username}'s turn` : 'Waiting…'}
              </p>
            </div>
          )}

          <div className="border-t border-slate-700 my-1" />
          <ActionBtn label="Scores" onClick={() => setShowScoreboard(true)} color="slate" />

          {isHost && (
            <>
              <ActionBtn label="Reshuffle" onClick={handleReshuffle} color="slate" />
              <ActionBtn label="Set Turn" onClick={() => setShowAdjustTurn(true)} color="slate" />
              <ActionBtn label="End Game" onClick={handleEndGame} color="red" />
            </>
          )}
        </div>
      </div>

      {/* ── Bottom: hand ── */}
      <div className="flex-none border-t border-slate-700">
        <HandRow
          hand={hand}
          selectedId={selectedCardId}
          onSelect={setSelectedCardId}
          flippedCardId={flippedCardId}
        />
      </div>

      {/* ── Toasts ── */}
      <ToastContainer toasts={toasts} />

      {/* ── Scoreboard overlay ── */}
      {showScoreboard && (
        <ScoreboardOverlay
          gameId={gameId}
          isHost={isHost}
          onClose={() => setShowScoreboard(false)}
        />
      )}

      {/* ── Confirm: Reshuffle ── */}
      {confirmDialog === 'reshuffle' && (
        <Modal
          title="Reshuffle deck?"
          message="All discarded cards will be returned to the draw pile."
          confirmLabel="Reshuffle"
          onConfirm={confirmReshuffle}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* ── Confirm: End Game ── */}
      {confirmDialog === 'endgame' && (
        <Modal
          title="End session?"
          message="Are you sure you want to end the session? This cannot be undone."
          confirmLabel="End Game"
          danger
          onConfirm={confirmEndGame}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* ── Adjust Turn modal ── */}
      {showAdjustTurn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-white rounded-2xl shadow-xl w-72 mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Set Turn</h2>
              <button onClick={() => setShowAdjustTurn(false)} className="text-gray-400 text-xl leading-none">×</button>
            </div>
            <div className="px-5 py-3 space-y-2">
              {players.map((p) => (
                <button
                  key={p.user_id}
                  onClick={() => handleAdjustTurn(p.player_position)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    p.player_position === effectivePos
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {p.username}
                  {p.player_position === effectivePos && (
                    <span className="ml-2 text-xs opacity-75">current</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionBtn({ label, onClick, disabled = false, color = 'slate' }) {
  const colors = {
    indigo: 'bg-indigo-600 hover:bg-indigo-500 text-white',
    emerald: 'bg-emerald-600 hover:bg-emerald-500 text-white',
    amber: 'bg-amber-500 hover:bg-amber-400 text-white',
    red: 'bg-red-600 hover:bg-red-500 text-white',
    slate: 'bg-slate-700 hover:bg-slate-600 text-slate-200',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${colors[color]}`}
    >
      {label}
    </button>
  );
}
