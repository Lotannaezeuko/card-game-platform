const db = require('../db');

const shuffle = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const dealStartingHand = async (req, res) => {
  try {
    const { game_id } = req.params;

    const gameResult = await db.query(
      'SELECT deck_id, starting_hand_size, status, host_user_id FROM games WHERE game_id = $1',
      [game_id]
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = gameResult.rows[0];

    const playerCheck = await db.query(
      'SELECT user_id FROM game_players WHERE game_id = $1 AND user_id = $2',
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
  } catch (error) {
    console.error('Deal starting hand error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const drawCard = async (req, res) => {
  try {
    const { game_id } = req.params;

    const playerCheck = await db.query(
      'SELECT game_player_id FROM game_players WHERE game_id = $1 AND user_id = $2',
      [game_id, req.user.userId]
    );

    if (playerCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied. You are not a player in this game.' });
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
  } catch (error) {
    console.error('Draw card error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const playCard = async (req, res) => {
  try {
    const { game_id } = req.params;
    const { hand_id } = req.body;

    if (!hand_id) {
      return res.status(400).json({ error: 'hand_id is required' });
    }

    const handResult = await db.query(
      'SELECT card_id FROM player_hands WHERE hand_id = $1 AND game_id = $2 AND user_id = $3',
      [hand_id, game_id, req.user.userId]
    );

    if (handResult.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found in your hand' });
    }

    const { card_id } = handResult.rows[0];

    await db.query(
      'DELETE FROM player_hands WHERE hand_id = $1',
      [hand_id]
    );

    const discardResult = await db.query(
      'INSERT INTO session_discard_pile (game_id, card_id, discarded_by) VALUES ($1, $2, $3) RETURNING *',
      [game_id, card_id, req.user.userId]
    );

    res.json({ discard_entry: discardResult.rows[0] });
  } catch (error) {
    console.error('Play card error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const passTurn = async (req, res) => {
  try {
    const { game_id } = req.params;

    const gameResult = await db.query(
      'SELECT current_player_position, turn_direction FROM games WHERE game_id = $1',
      [game_id]
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const { current_player_position, turn_direction } = gameResult.rows[0];

    const countResult = await db.query(
      'SELECT COUNT(*) AS player_count FROM game_players WHERE game_id = $1',
      [game_id]
    );

    const playerCount = parseInt(countResult.rows[0].player_count);

    if (playerCount === 0) {
      return res.status(400).json({ error: 'No players in this game' });
    }

    let nextPosition;
    if (turn_direction === 'counterclockwise') {
      nextPosition = ((current_player_position - 2 + playerCount) % playerCount) + 1;
    } else {
      nextPosition = (current_player_position % playerCount) + 1;
    }

    const updateResult = await db.query(
      'UPDATE games SET current_player_position = $1 WHERE game_id = $2 RETURNING game_id, current_player_position, turn_direction',
      [nextPosition, game_id]
    );

    res.json({ game: updateResult.rows[0] });
  } catch (error) {
    console.error('Pass turn error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const reshuffleDeck = async (req, res) => {
  try {
    const { game_id } = req.params;

    const discardResult = await db.query(
      'SELECT card_id FROM session_discard_pile WHERE game_id = $1',
      [game_id]
    );

    if (discardResult.rows.length === 0) {
      return res.json({ message: 'Discard pile is empty, nothing to reshuffle' });
    }

    const cardIds = discardResult.rows.map((r) => r.card_id);
    shuffle(cardIds);

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
  } catch (error) {
    console.error('Reshuffle deck error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateScore = async (req, res) => {
  try {
    const { game_id } = req.params;
    const { user_id, score } = req.body;

    if (user_id === undefined || score === undefined) {
      return res.status(400).json({ error: 'user_id and score are required' });
    }

    const result = await db.query(
      `UPDATE game_players SET score = $1
       WHERE game_id = $2 AND user_id = $3
       RETURNING *`,
      [score, game_id, user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found in this game' });
    }

    res.json({ player: result.rows[0] });
  } catch (error) {
    console.error('Update score error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const endSession = async (req, res) => {
  try {
    const { game_id } = req.params;

    const gameResult = await db.query(
      'SELECT host_user_id, status FROM games WHERE game_id = $1',
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

    res.json({ message: 'Game session ended', game: result.rows[0] });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  dealStartingHand,
  drawCard,
  playCard,
  passTurn,
  reshuffleDeck,
  updateScore,
  endSession,
};
