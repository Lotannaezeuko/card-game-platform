const db = require('../db');

const getAllGames = async (req, res) => {
  try {
    const { active } = req.query;

    let query = `
      SELECT DISTINCT g.*, d.deck_name, u.username AS host_username
      FROM games g
      LEFT JOIN game_players gp ON g.game_id = gp.game_id
      LEFT JOIN decks d ON g.deck_id = d.deck_id
      LEFT JOIN users u ON g.host_user_id = u.user_id
      WHERE (g.host_user_id = $1 OR gp.user_id = $1)
    `;
    const params = [req.user.userId];

    if (active === 'true') {
      query += ' AND g.ended_at IS NULL';
    }

    query += ' ORDER BY g.started_at DESC';

    const result = await db.query(query, params);

    res.json({ games: result.rows });
  } catch (error) {
    console.error('Get all games error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getGameById = async (req, res) => {
  try {
    const { game_id } = req.params;

    const gameResult = await db.query(
      `SELECT g.*, d.deck_name, u.username AS host_username
       FROM games g
       LEFT JOIN decks d ON g.deck_id = d.deck_id
       LEFT JOIN users u ON g.host_user_id = u.user_id
       WHERE g.game_id = $1`,
      [game_id]
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = gameResult.rows[0];

    const playerResult = await db.query(
      `SELECT gp.*, u.username, u.email
       FROM game_players gp
       LEFT JOIN users u ON gp.user_id = u.user_id
       WHERE gp.game_id = $1
       ORDER BY gp.player_position ASC`,
      [game_id]
    );

    const isHost = game.host_user_id === req.user.userId;
    const isPlayer = playerResult.rows.some((p) => p.user_id === req.user.userId);

    if (!isHost && !isPlayer) {
      return res.status(403).json({ error: 'Access denied. You are not a participant in this game.' });
    }

    res.json({ game, players: playerResult.rows });
  } catch (error) {
    console.error('Get game by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createGame = async (req, res) => {
  try {
    const { deck_id, is_online } = req.body;

    if (!deck_id) {
      return res.status(400).json({ error: 'Deck ID is required' });
    }

    const deckResult = await db.query(
      'SELECT user_id FROM decks WHERE deck_id = $1',
      [deck_id]
    );

    if (deckResult.rows.length === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    if (deckResult.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied. You do not own this deck.' });
    }

    const gameResult = await db.query(
      `INSERT INTO games (deck_id, host_user_id, is_online, game_state)
       VALUES ($1, $2, $3, '{}')
       RETURNING *`,
      [deck_id, req.user.userId, is_online || false]
    );

    const game = gameResult.rows[0];

    await db.query(
      `INSERT INTO game_players (game_id, user_id, player_position)
       VALUES ($1, $2, 1)`,
      [game.game_id, req.user.userId]
    );

    res.status(201).json({ game, message: 'Game created successfully' });
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateGameState = async (req, res) => {
  try {
    const { game_id } = req.params;
    const { game_state } = req.body;

    if (!game_state || typeof game_state !== 'object') {
      return res.status(400).json({ error: 'Game state is required and must be an object' });
    }

    const playerResult = await db.query(
      'SELECT * FROM game_players WHERE game_id = $1 AND user_id = $2',
      [game_id, req.user.userId]
    );

    if (playerResult.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied. You are not a player in this game.' });
    }

    const gameCheck = await db.query(
      'SELECT ended_at FROM games WHERE game_id = $1',
      [game_id]
    );

    if (gameCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (gameCheck.rows[0].ended_at !== null) {
      return res.status(400).json({ error: 'Game has already ended' });
    }

    const result = await db.query(
      'UPDATE games SET game_state = $1 WHERE game_id = $2 RETURNING *',
      [JSON.stringify(game_state), game_id]
    );

    res.json({ game: result.rows[0] });
  } catch (error) {
    console.error('Update game state error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const endGame = async (req, res) => {
  try {
    const { game_id } = req.params;

    const gameResult = await db.query(
      'SELECT host_user_id, ended_at FROM games WHERE game_id = $1',
      [game_id]
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (gameResult.rows[0].host_user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied. Only the host can end the game.' });
    }

    if (gameResult.rows[0].ended_at !== null) {
      return res.status(400).json({ error: 'Game has already ended' });
    }

    const result = await db.query(
      'UPDATE games SET ended_at = CURRENT_TIMESTAMP WHERE game_id = $1 RETURNING *',
      [game_id]
    );

    res.json({ message: 'Game ended successfully', game: result.rows[0] });
  } catch (error) {
    console.error('End game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const addPlayerToGame = async (req, res) => {
  try {
    const { game_id } = req.params;
    const { user_id } = req.body;

    const gameResult = await db.query(
      'SELECT ended_at FROM games WHERE game_id = $1',
      [game_id]
    );

    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (gameResult.rows[0].ended_at !== null) {
      return res.status(400).json({ error: 'Game has already ended' });
    }

    if (user_id) {
      const existingPlayer = await db.query(
        'SELECT * FROM game_players WHERE game_id = $1 AND user_id = $2',
        [game_id, user_id]
      );

      if (existingPlayer.rows.length > 0) {
        return res.status(409).json({ error: 'Player is already in this game' });
      }
    }

    const positionResult = await db.query(
      'SELECT COALESCE(MAX(player_position), 0) + 1 AS next_position FROM game_players WHERE game_id = $1',
      [game_id]
    );

    const nextPosition = positionResult.rows[0].next_position;

    const result = await db.query(
      `INSERT INTO game_players (game_id, user_id, player_position, score)
       VALUES ($1, $2, $3, 0)
       RETURNING *`,
      [game_id, user_id || null, nextPosition]
    );

    res.status(201).json({ player: result.rows[0], message: 'Player added to game' });
  } catch (error) {
    console.error('Add player to game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const removePlayerFromGame = async (req, res) => {
  try {
    const { game_id, game_player_id } = req.params;

    const result = await db.query(
      `SELECT gp.*, g.host_user_id
       FROM game_players gp
       JOIN games g ON gp.game_id = g.game_id
       WHERE gp.game_player_id = $1 AND gp.game_id = $2`,
      [game_player_id, game_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found in this game' });
    }

    const record = result.rows[0];
    const isHost = record.host_user_id === req.user.userId;
    const isSelf = record.user_id === req.user.userId;

    if (!isHost && !isSelf) {
      return res.status(403).json({ error: 'Access denied. Only the host or the player themselves can remove a player.' });
    }

    await db.query(
      'DELETE FROM game_players WHERE game_player_id = $1',
      [game_player_id]
    );

    res.json({ message: 'Player removed from game' });
  } catch (error) {
    console.error('Remove player from game error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllGames,
  getGameById,
  createGame,
  updateGameState,
  endGame,
  addPlayerToGame,
  removePlayerFromGame,
};
