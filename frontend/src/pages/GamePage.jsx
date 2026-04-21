import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import PlayerChip from '../components/game/PlayerChip';
import DiscardPile, { DrawPileCard } from '../components/game/DiscardPile';
import HandRow from '../components/game/HandRow';
import GameBoard from '../components/game/GameBoard';
import FlippableCard from '../components/cards/FlippableCard';
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
  const [boardCards, setBoardCards] = useState([]);
  const [boardScale, setBoardScale] = useState(1);
  const [showBoard, setShowBoard] = useState(false);
  const [activeDragCard, setActiveDragCard] = useState(null);
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
        setBoardCards(gameData.game.game_state?.board || []);
        // All players read hideDiscardPile from game_state (host writes it there after deck fetch)
        setHideDiscardPile(gameData.game.game_state?.hideDiscardPile ?? false);

        // Host-only: fetch deck settings and persist hideDiscardPile into game_state
        // so non-owner players (who can't access private decks) still see the right value
        const deckId = gameData.game.deck_id;
        const isHostNow = gameData.game.host_user_id === user?.userId;
        if (deckId && isHostNow) {
          apiFetch(`/decks/${deckId}`)
            .then(async (deckData) => {
              const val = deckData.attributes?.hideDiscardPile ?? false;
              setHideDiscardPile(val);
              // Only write to game_state if the value differs from what's already there
              if (val !== (gameData.game.game_state?.hideDiscardPile ?? false)) {
                try {
                  await apiFetch(`/games/${gameId}/state`, {
                    method: 'PUT',
                    body: { game_state: { ...(gameData.game.game_state || {}), hideDiscardPile: val } },
                  });
                } catch { /* non-critical */ }
              }
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

    socket.on('board_card_placed', ({ user_id, username, card_name }) => {
      if (user_id !== userRef.current?.userId) {
        setBoardCards([]); // will resync on next refetchBoard
        refetchBoardRef.current();
        addToast(`${username} placed ${card_name} on the board`);
      }
    });

    socket.on('card_played', ({ user_id, username, card }) => {
      setDiscardTop(card);
      if (user_id !== userRef.current?.userId) {
        addToast(`${username} played ${card.card_name}`);
        refetchBoardRef.current();
      }
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
      socket.off('board_card_placed');
      socket.off('card_drawn');
      socket.off('card_played');
      socket.off('turn_passed');
      socket.off('deck_reshuffled');
      socket.off('score_updated');
      socket.off('game_ended');
      socket.off('player_disconnected');
    };
  }, [socket, game]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Board helpers ─────────────────────────────────────────────────
  const refetchBoard = useCallback(async () => {
    try {
      const gameData = await apiFetch(`/games/${gameId}`);
      setBoardCards(gameData.game.game_state?.board || []);
      if (gameData.discard_top) setDiscardTop(gameData.discard_top);
      setHideDiscardPile(gameData.game.game_state?.hideDiscardPile ?? false);
    } catch {
      // non-critical — board will sync on next event
    }
  }, [gameId]);

  const refetchBoardRef = useRef(refetchBoard);
  useEffect(() => { refetchBoardRef.current = refetchBoard; }, [refetchBoard]);

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

  // ── Board actions ──────────────────────────────────────────────────
  const handleCardDroppedOnBoard = useCallback(async (card, x, y) => {
    const newBoardCard = {
      ...card,
      placedBy: user?.username,
      x: Math.max(0, x),
      y: Math.max(0, y),
    };
    const newBoard = [...boardCards, newBoardCard];
    // Optimistic updates
    setBoardCards(newBoard);
    setHand((prev) => prev.filter((c) => c.hand_id !== card.hand_id));
    try {
      // Use the dedicated board endpoint — removes card from player_hands without
      // touching session_discard_pile, and emits board_card_placed to all players
      await apiFetch(`/games/${gameId}/board`, {
        method: 'POST',
        body: { hand_id: card.hand_id, board: newBoard },
      });
    } catch (err) {
      setBoardCards((prev) => prev.filter((c) => c.hand_id !== card.hand_id));
      setHand((prev) => [...prev, card]);
      addToast(err.message || 'Could not place card on board');
    }
  }, [boardCards, gameId, user]);

  const handleBoardCardRepositioned = useCallback(async (card, newX, newY) => {
    const newBoard = boardCards.map((c) =>
      c.hand_id === card.hand_id ? { ...c, x: Math.max(0, newX), y: Math.max(0, newY) } : c
    );
    setBoardCards(newBoard);
    try {
      const currentGame = await apiFetch(`/games/${gameId}`);
      await apiFetch(`/games/${gameId}/state`, {
        method: 'PUT',
        body: { game_state: { ...(currentGame.game.game_state || {}), board: newBoard } },
      });
    } catch {
      refetchBoard();
    }
  }, [boardCards, gameId, refetchBoard]);

  const handleClearBoard = useCallback(async () => {
    if (!isHost) return;
    setBoardCards([]);
    try {
      const currentGame = await apiFetch(`/games/${gameId}`);
      await apiFetch(`/games/${gameId}/state`, {
        method: 'PUT',
        body: { game_state: { ...(currentGame.game.game_state || {}), board: [] } },
      });
    } catch {
      refetchBoard();
      addToast('Could not clear board');
    }
  }, [isHost, gameId, refetchBoard]);

  // ── DnD sensors + handlers ─────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const handleDragStart = useCallback((event) => {
    setActiveDragCard(event.active.data.current?.card || null);
  }, []);

  const handleDragEnd = useCallback((event) => {
    const { active, over, delta } = event;
    setActiveDragCard(null);
    if (!over) return;
    const dragType = active.data.current?.type;
    const card = active.data.current?.card;
    if (!card) return;

    if (dragType === 'hand-card' && over.id === 'game-board') {
      const translated = event.active.rect.current.translated;
      const x = (translated.left - over.rect.left) / boardScale;
      const y = (translated.top - over.rect.top) / boardScale;
      handleCardDroppedOnBoard(card, x, y);
    } else if (dragType === 'board-card') {
      const existing = boardCards.find((c) => c.hand_id === card.hand_id);
      if (!existing) return;
      handleBoardCardRepositioned(card, existing.x + delta.x / boardScale, existing.y + delta.y / boardScale);
    }
  }, [boardScale, boardCards, handleCardDroppedOnBoard, handleBoardCardRepositioned]);

  if (!game) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex items-center justify-center">
        <span className="text-slate-400 text-sm">Loading game…</span>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
          <button
            onClick={() => setShowBoard((v) => !v)}
            className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-2 py-1 rounded"
          >
            {showBoard ? 'Piles' : 'Board'}
          </button>
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

      {/* ── Middle: board + piles + actions ── */}
      <div className="flex-1 flex min-h-0">

        {/* Board panel: toggle-controlled on all screen sizes */}
        <div className={`${showBoard ? 'flex' : 'hidden'} flex-1 min-h-0`}>
          <GameBoard
            boardCards={boardCards}
            isHost={isHost}
            onClearBoard={handleClearBoard}
            scale={boardScale}
            onScaleChange={setBoardScale}
            className="flex-1"
          />
        </div>

        {/* Piles + actions: hidden when board shown */}
        <div className={`${showBoard ? 'hidden' : 'flex'} flex-1 min-h-0`}>

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
        <div className="w-28 flex-none flex flex-col justify-start overflow-y-auto gap-1 pr-2 py-2">
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

          <div className="border-t border-slate-700 mt-0.5 mb-0.5" />
          <ActionBtn label="Scores" onClick={() => setShowScoreboard(true)} color="slate" />

          {isHost && (
            <>
              <ActionBtn label="Reshuffle" onClick={handleReshuffle} color="slate" />
              <ActionBtn label="Set Turn" onClick={() => setShowAdjustTurn(true)} color="slate" />
              <ActionBtn label="End Game" onClick={handleEndGame} color="red" />
            </>
          )}
        </div>
        </div>{/* end piles + actions wrapper */}
      </div>{/* end middle */}

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

      {/* ── DragOverlay: card preview while dragging ── */}
      <DragOverlay>
        {activeDragCard ? (
          <div style={{ width: 80, opacity: 0.9, pointerEvents: 'none' }}>
            <FlippableCard
              cardName={activeDragCard.card_name}
              frontText={activeDragCard.front_text}
              frontImageUrl={activeDragCard.front_image_url}
              backText={activeDragCard.back_text}
              backImageUrl={activeDragCard.back_image_url}
              attributes={activeDragCard.attributes}
              isSelected={false}
              isFlipped={false}
              size="hand"
            />
          </div>
        ) : null}
      </DragOverlay>

    </div>
    </DndContext>
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
      className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${colors[color]}`}
    >
      {label}
    </button>
  );
}
