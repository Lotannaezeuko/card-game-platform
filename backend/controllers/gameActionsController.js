const db = require('../db');
const {
  emitGameStarted,
  emitCardDrawn,
  emitCardPlayed,
  emitBoardCardPlaced,
  emitTurnPassed,
  emitReshuffle,
  emitScoreUpdated,
  emitGameEnded,
} = require('../socket/handlers/gameplay');

// Fisher-Yates shuffle used when dealing hands and reshuffling the draw pile
const shuffle = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

// POST /api/games/:game_id/deal
// Shuffles the deck, deals a starting hand to every player, places the
// remainder in the draw pile, and marks the game as active
const dealStartingHand = async (req, res) => {
  try {
    const { game_id } = req.params;

    const gameResult = await db.query(
      'SELECT deck_id, starting_hand_size, status, host_user_id, game_code FROM games WHERE game_id = $1',
      [game_id]
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = gameResult.rows[0];

    const playerCheck = await db.query(
      'SELECT user_id FROM game_players WHERE game_id = $1 AND user_id IS NOT DISTINCT FROM $2',
      [game_id, req.user.userId]
    );

    const isHost = game.host_user_id === req.user.userId;
    if (playerCheck.rows.length === 0 && !isHost) {
      return res.status(403).json({ error: 'Access denied. You are not a participant in this game.' });
    }

    const playersResult = await db.query(
      'SELECT user_id FROM game_players WHERE game_id = $1 ORDER BY player_position ASC',
      [game_id]
    );
    const players = playersResult.rows;

    // Expand deck_cards by quantity so each copy is treated as a separate draw
    const deckCardsResult = await db.query(
      'SELECT card_id, quantity FROM deck_cards WHERE deck_id = $1',
      [game.deck_id]
    );

    const expandedDeck = [];
    for (const row of deckCardsResult.rows) {
      for (let i = 0; i < row.quantity; i++) {
        expandedDeck.push(row.card_id);
      }
    }
    shuffle(expandedDeck);

    // Deal cards from the front of the shuffled deck to each player in order
    const handSize = game.starting_hand_size;
    for (const player of players) {
      const playerCards = expandedDeck.splice(0, handSize);
      for (const card_id of playerCards) {
        await db.query(
          'INSERT INTO player_hands (game_id, user_id, card_id) VALUES ($1, $2, $3)',
          [game_id, player.user_id, card_id]
        );
      }
    }

    // Remaining cards after dealing become the draw pile, ordered by their position in the shuffled deck
    for (let i = 0; i < expandedDeck.length; i++) {
      await db.query(
        'INSERT INTO session_draw_pile (game_id, card_id, pile_order) VALUES ($1, $2, $3)',
        [game_id, expandedDeck[i], i + 1]
      );
    }

    await db.query(
      "UPDATE games SET status = 'active' WHERE game_id = $1",
      [game_id]
    );

    res.json({ message: 'Starting hand dealt successfully' });

    emitGameStarted(req.app.get('io'), game.game_code, {
      starting_hand_size: game.starting_hand_size,
      player_count: players.length,
    });
  } catch (error) {
    console.error('Deal starting hand error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/games/:game_id/hand
// Returns the authenticated player's current hand for this game
const getPlayerHand = async (req, res) => {
  try {
    const { game_id } = req.params;

    const playerCheck = await db.query(
      'SELECT game_player_id FROM game_players WHERE game_id = $1 AND user_id IS NOT DISTINCT FROM $2',
      [game_id, req.user.userId]
    );

    if (playerCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied. You are not a player in this game.' });
    }

    const handResult = await db.query(
      `SELECT ph.hand_id, ph.card_id, ph.acquired_at,
              c.card_name, c.front_text, c.front_image_url,
              c.back_text, c.back_image_url, c.is_unique, c.attributes
       FROM player_hands ph
       JOIN cards c ON c.card_id = ph.card_id
       WHERE ph.game_id = $1 AND ph.user_id IS NOT DISTINCT FROM $2
       ORDER BY ph.acquired_at ASC`,
      [game_id, req.user.userId]
    );

    res.json({ hand: handResult.rows });
  } catch (error) {
    console.error('Get player hand error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/games/:game_id/draw
// Draws the next undrawn card from the draw pile and adds it to the player's hand.
// current_player_position of 0 is treated as position 1 (game just started, no turn set yet).
const drawCard = async (req, res) => {
  try {
    const { game_id } = req.params;

    const playerResult = await db.query(
      'SELECT player_position FROM game_players WHERE game_id = $1 AND user_id IS NOT DISTINCT FROM $2',
      [game_id, req.user.userId]
    );

    if (playerResult.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied. You are not a player in this game.' });
    }

    const gameResult = await db.query(
      'SELECT current_player_position, game_code FROM games WHERE game_id = $1',
      [game_id]
    );

    const { current_player_position, game_code } = gameResult.rows[0];
    // Treat 0 as position 1 so the first player can act before any turn has been explicitly set
    const effectivePosition = current_player_position === 0 ? 1 : current_player_position;

    if (playerResult.rows[0].player_position !== effectivePosition) {
      return res.status(403).json({ error: 'It is not your turn.' });
    }

    const drawResult = await db.query(
      'SELECT pile_id, card_id FROM session_draw_pile WHERE game_id = $1 AND is_drawn = false ORDER BY pile_order ASC LIMIT 1',
      [game_id]
    );

    if (drawResult.rows.length === 0) {
      return res.status(404).json({ error: 'No cards remaining in the draw pile' });
    }

    const { pile_id, card_id } = drawResult.rows[0];

    await db.query(
      'UPDATE session_draw_pile SET is_drawn = true WHERE pile_id = $1',
      [pile_id]
    );

    const handResult = await db.query(
      'INSERT INTO player_hands (game_id, user_id, card_id) VALUES ($1, $2, $3) RETURNING *',
      [game_id, req.user.userId, card_id]
    );

    res.status(201).json({ hand_entry: handResult.rows[0] });

    // Broadcast that a draw happened without revealing the card to other players
    emitCardDrawn(req.app.get('io'), game_code, {
      user_id: req.user.userId,
      username: req.user.username,
    });
  } catch (error) {
    console.error('Draw card error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/games/:game_id/play
// Removes a card from the player's hand and places it on the discard pile,
// then broadcasts the full card details to all players in the room
const playCard = async (req, res) => {
  try {
    const { game_id } = req.params;
    const { hand_id } = req.body;

    if (!hand_id) {
      return res.status(400).json({ error: 'hand_id is required' });
    }

    const playerResult = await db.query(
      'SELECT player_position FROM game_players WHERE game_id = $1 AND user_id IS NOT DISTINCT FROM $2',
      [game_id, req.user.userId]
    );

    if (playerResult.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied. You are not a player in this game.' });
    }

    const gameResult = await db.query(
      'SELECT current_player_position, game_code FROM games WHERE game_id = $1',
      [game_id]
    );

    const { current_player_position, game_code } = gameResult.rows[0];
    const effectivePosition = current_player_position === 0 ? 1 : current_player_position;

    if (playerResult.rows[0].player_position !== effectivePosition) {
      return res.status(403).json({ error: 'It is not your turn.' });
    }

    const handResult = await db.query(
      `SELECT ph.card_id, c.card_name, c.front_text, c.front_image_url, c.attributes
       FROM player_hands ph
       JOIN cards c ON c.card_id = ph.card_id
       WHERE ph.hand_id = $1 AND ph.game_id = $2 AND ph.user_id IS NOT DISTINCT FROM $3`,
      [hand_id, game_id, req.user.userId]
    );

    if (handResult.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found in your hand' });
    }

    const { card_id, card_name, front_text, front_image_url, attributes } = handResult.rows[0];

    await db.query(
      'DELETE FROM player_hands WHERE hand_id = $1',
      [hand_id]
    );

    const discardResult = await db.query(
      'INSERT INTO session_discard_pile (game_id, card_id, discarded_by) VALUES ($1, $2, $3) RETURNING *',
      [game_id, card_id, req.user.userId]
    );

    res.json({ discard_entry: discardResult.rows[0] });

    emitCardPlayed(req.app.get('io'), game_code, {
      user_id: req.user.userId,
      username: req.user.username,
      card: { card_id, card_name, front_text, front_image_url, attributes },
    });
  } catch (error) {
    console.error('Play card error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/games/:game_id/pass
// Advances the turn to the next player using modular arithmetic to wrap around.
// Supports both clockwise and counterclockwise turn directions.
const passTurn = async (req, res) => {
  try {
    const { game_id } = req.params;

    const gameResult = await db.query(
      'SELECT current_player_position, turn_direction, game_code FROM games WHERE game_id = $1',
      [game_id]
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const { current_player_position, turn_direction, game_code } = gameResult.rows[0];

    const playerResult = await db.query(
      'SELECT player_position FROM game_players WHERE game_id = $1 AND user_id IS NOT DISTINCT FROM $2',
      [game_id, req.user.userId]
    );

    if (playerResult.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied. You are not a player in this game.' });
    }

    const callerPosition = playerResult.rows[0].player_position;
    const effectivePosition = current_player_position === 0 ? 1 : current_player_position;

    if (callerPosition !== effectivePosition) {
      return res.status(403).json({ error: 'It is not your turn.' });
    }

    const countResult = await db.query(
      'SELECT COUNT(*) AS player_count FROM game_players WHERE game_id = $1',
      [game_id]
    );

    const playerCount = parseInt(countResult.rows[0].player_count);

    if (playerCount === 0) {
      return res.status(400).json({ error: 'No players in this game' });
    }

    // Positions are 1-indexed so we convert to 0-based before applying modulo, then back
    let nextPosition;
    if (turn_direction === 'counterclockwise') {
      nextPosition = ((effectivePosition - 2 + playerCount) % playerCount) + 1;
    } else {
      nextPosition = (effectivePosition % playerCount) + 1;
    }

    const updateResult = await db.query(
      'UPDATE games SET current_player_position = $1 WHERE game_id = $2 RETURNING game_id, current_player_position, turn_direction',
      [nextPosition, game_id]
    );

    res.json({ game: updateResult.rows[0] });

    emitTurnPassed(req.app.get('io'), game_code, {
      current_player_position: nextPosition,
      turn_direction,
    });
  } catch (error) {
    console.error('Pass turn error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/games/:game_id/reshuffle
// Moves all cards from the discard pile back into the draw pile in a new random order.
// New cards are appended after the existing draw pile so in-flight draws are not disrupted.
const reshuffleDeck = async (req, res) => {
  try {
    const { game_id } = req.params;

    const hostCheck = await db.query(
      'SELECT host_user_id, game_code FROM games WHERE game_id = $1',
      [game_id]
    );

    if (hostCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (hostCheck.rows[0].host_user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied. Only the host can reshuffle.' });
    }

    const { game_code } = hostCheck.rows[0];

    const discardResult = await db.query(
      'SELECT card_id FROM session_discard_pile WHERE game_id = $1',
      [game_id]
    );

    if (discardResult.rows.length === 0) {
      return res.json({ message: 'Discard pile is empty, nothing to reshuffle' });
    }

    const cardIds = discardResult.rows.map((r) => r.card_id);
    shuffle(cardIds);

    // Start pile_order after the last existing draw pile entry to preserve draw order
    const maxOrderResult = await db.query(
      'SELECT COALESCE(MAX(pile_order), 0) AS max_order FROM session_draw_pile WHERE game_id = $1',
      [game_id]
    );
    const startOrder = parseInt(maxOrderResult.rows[0].max_order) + 1;

    await db.query(
      'DELETE FROM session_discard_pile WHERE game_id = $1',
      [game_id]
    );

    for (let i = 0; i < cardIds.length; i++) {
      await db.query(
        'INSERT INTO session_draw_pile (game_id, card_id, pile_order, is_drawn) VALUES ($1, $2, $3, false)',
        [game_id, cardIds[i], startOrder + i]
      );
    }

    res.json({ message: 'Discard pile reshuffled into draw pile', count: cardIds.length });

    emitReshuffle(req.app.get('io'), game_code, { count: cardIds.length });
  } catch (error) {
    console.error('Reshuffle deck error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/games/:game_id/score
// Updates a player's score. Only the host can call this.
const updateScore = async (req, res) => {
  try {
    const { game_id } = req.params;
    const { user_id, score } = req.body;

    if (user_id === undefined || score === undefined) {
      return res.status(400).json({ error: 'user_id and score are required' });
    }

    const hostCheck = await db.query(
      'SELECT host_user_id, game_code FROM games WHERE game_id = $1',
      [game_id]
    );

    if (hostCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (hostCheck.rows[0].host_user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied. Only the host can update scores.' });
    }

    const result = await db.query(
      `UPDATE game_players SET score = $1
       WHERE game_id = $2 AND user_id IS NOT DISTINCT FROM $3
       RETURNING *`,
      [score, game_id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found in this game' });
    }

    const usernameResult = await db.query(
      'SELECT username FROM users WHERE user_id = $1',
      [user_id]
    );

    res.json({ player: result.rows[0] });

    emitScoreUpdated(req.app.get('io'), hostCheck.rows[0].game_code, {
      user_id,
      username: usernameResult.rows[0]?.username,
      score,
    });
  } catch (error) {
    console.error('Update score error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/games/:game_id/scores
// Returns all player scores ordered from highest to lowest
const getFinalScores = async (req, res) => {
  try {
    const { game_id } = req.params;

    const gameResult = await db.query(
      'SELECT game_id, status, ended_at, host_user_id FROM games WHERE game_id = $1',
      [game_id]
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const playerCheck = await db.query(
      'SELECT game_player_id FROM game_players WHERE game_id = $1 AND user_id IS NOT DISTINCT FROM $2',
      [game_id, req.user.userId]
    );

    const isHost = gameResult.rows[0].host_user_id === req.user.userId;
    if (playerCheck.rows.length === 0 && !isHost) {
      return res.status(403).json({ error: 'Access denied. You are not a participant in this game.' });
    }

    const scoresResult = await db.query(
      `SELECT gp.game_player_id, gp.user_id, gp.player_position, gp.score,
              u.username
       FROM game_players gp
       LEFT JOIN users u ON u.user_id = gp.user_id
       WHERE gp.game_id = $1
       ORDER BY gp.score DESC, gp.player_position ASC`,
      [game_id]
    );

    res.json({
      game_id: gameResult.rows[0].game_id,
      status: gameResult.rows[0].status,
      ended_at: gameResult.rows[0].ended_at,
      scores: scoresResult.rows,
    });
  } catch (error) {
    console.error('Get final scores error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/games/:game_id/session/end
// Ends the game session, broadcasts final scores to all players in the room
const endSession = async (req, res) => {
  try {
    const { game_id } = req.params;

    const gameResult = await db.query(
      'SELECT host_user_id, status, game_code FROM games WHERE game_id = $1',
      [game_id]
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (gameResult.rows[0].host_user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied. Only the host can end the session.' });
    }

    if (gameResult.rows[0].status === 'ended') {
      return res.status(400).json({ error: 'Game session has already ended' });
    }

    const result = await db.query(
      "UPDATE games SET status = 'ended', ended_at = CURRENT_TIMESTAMP WHERE game_id = $1 RETURNING *",
      [game_id]
    );

    const scoresResult = await db.query(
      `SELECT gp.user_id, gp.player_position, gp.score, u.username
       FROM game_players gp
       LEFT JOIN users u ON u.user_id = gp.user_id
       WHERE gp.game_id = $1
       ORDER BY gp.score DESC`,
      [game_id]
    );

    res.json({ message: 'Game session ended', game: result.rows[0] });

    emitGameEnded(req.app.get('io'), gameResult.rows[0].game_code, {
      ended_at: result.rows[0].ended_at,
      scores: scoresResult.rows,
    });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/games/:game_id/board
// Moves a card from the player's hand to the shared board stored in game_state.
// The full board array is sent by the client so the server just persists it.
const placeCardOnBoard = async (req, res) => {
  try {
    const { game_id } = req.params;
    const { hand_id, board } = req.body;

    if (!hand_id || !Array.isArray(board)) {
      return res.status(400).json({ error: 'hand_id and board array are required' });
    }

    const gameResult = await db.query(
      'SELECT game_code, game_state, status FROM games WHERE game_id = $1',
      [game_id]
    );
    if (gameResult.rows.length === 0) return res.status(404).json({ error: 'Game not found' });
    const game = gameResult.rows[0];
    if (game.status !== 'active') return res.status(400).json({ error: 'Game is not active' });

    // Confirm the card belongs to this player before moving it
    const handCheck = await db.query(
      `SELECT ph.hand_id, c.card_id, c.card_name
       FROM player_hands ph
       JOIN cards c ON c.card_id = ph.card_id
       WHERE ph.hand_id = $1 AND ph.game_id = $2 AND ph.user_id IS NOT DISTINCT FROM $3`,
      [hand_id, game_id, req.user.userId]
    );
    if (handCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Card not found in your hand' });
    }
    const { card_name } = handCheck.rows[0];

    await db.query('DELETE FROM player_hands WHERE hand_id = $1', [hand_id]);

    // Merge the new board into the existing game_state so other fields are preserved
    const existingState = game.game_state || {};
    await db.query(
      'UPDATE games SET game_state = $1 WHERE game_id = $2',
      [JSON.stringify({ ...existingState, board }), game_id]
    );

    emitBoardCardPlaced(req.app.get('io'), game.game_code, {
      user_id: req.user.userId,
      username: req.user.username,
      card_name,
    });

    res.json({ success: true });
  } catch (err) {
    console.error('placeCardOnBoard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getPlayerHand,
  dealStartingHand,
  drawCard,
  playCard,
  placeCardOnBoard,
  passTurn,
  reshuffleDeck,
  updateScore,
  getFinalScores,
  endSession,
};
