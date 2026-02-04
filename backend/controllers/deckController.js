const db = require('../db');

const getAllDecks = async (req, res) => {
  try {
    const { is_public } = req.query;

    let query;
    let params;

    if (is_public === 'true') {
      query = `
        SELECT d.deck_id, d.user_id, d.deck_name, d.description, d.is_public,
               d.created_at, d.updated_at, u.username,
               COALESCE(SUM(dc.quantity), 0)::int AS card_count
        FROM decks d
        LEFT JOIN deck_cards dc ON d.deck_id = dc.deck_id
        LEFT JOIN users u ON d.user_id = u.user_id
        WHERE d.is_public = true
        GROUP BY d.deck_id, u.username
        ORDER BY d.created_at DESC
      `;
      params = [];
    } else {
      query = `
        SELECT d.deck_id, d.user_id, d.deck_name, d.description, d.is_public,
               d.created_at, d.updated_at,
               COALESCE(SUM(dc.quantity), 0)::int AS card_count
        FROM decks d
        LEFT JOIN deck_cards dc ON d.deck_id = dc.deck_id
        WHERE d.user_id = $1
        GROUP BY d.deck_id
        ORDER BY d.created_at DESC
      `;
      params = [req.user.userId];
    }

    const result = await db.query(query, params);

    res.json({ decks: result.rows });
  } catch (error) {
    console.error('Get all decks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getDeckById = async (req, res) => {
  try {
    const { deck_id } = req.params;

    const deckResult = await db.query(
      `SELECT d.deck_id, d.user_id, d.deck_name, d.description, d.is_public,
              d.created_at, d.updated_at, u.username
       FROM decks d
       LEFT JOIN users u ON d.user_id = u.user_id
       WHERE d.deck_id = $1`,
      [deck_id]
    );

    if (deckResult.rows.length === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    const deck = deckResult.rows[0];

    if (!deck.is_public && deck.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied. This deck is private.' });
    }

    const cardsResult = await db.query(
      `SELECT c.card_id, c.card_name, c.card_type, c.content, c.image_url,
              c.attributes, c.created_at, dc.quantity, dc.card_order
       FROM deck_cards dc
       JOIN cards c ON dc.card_id = c.card_id
       WHERE dc.deck_id = $1
       ORDER BY dc.card_order ASC, c.card_name ASC`,
      [deck_id]
    );

    res.json({
      ...deck,
      cards: cardsResult.rows,
    });
  } catch (error) {
    console.error('Get deck by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createDeck = async (req, res) => {
  try {
    const { deck_name, description, is_public } = req.body;

    if (!deck_name || deck_name.trim() === '') {
      return res.status(400).json({ error: 'Deck name is required' });
    }

    if (deck_name.length > 100) {
      return res.status(400).json({ error: 'Deck name must be 100 characters or less' });
    }

    const result = await db.query(
      `INSERT INTO decks (user_id, deck_name, description, is_public)
       VALUES ($1, $2, $3, $4)
       RETURNING deck_id, deck_name, description, is_public, created_at`,
      [req.user.userId, deck_name.trim(), description || null, is_public || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create deck error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateDeck = async (req, res) => {
  try {
    const { deck_id } = req.params;
    const { deck_name, description, is_public } = req.body;

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

    if (deck_name !== undefined) {
      if (deck_name.trim() === '') {
        return res.status(400).json({ error: 'Deck name cannot be empty' });
      }
      if (deck_name.length > 100) {
        return res.status(400).json({ error: 'Deck name must be 100 characters or less' });
      }
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (deck_name !== undefined) {
      updates.push(`deck_name = $${paramIndex++}`);
      values.push(deck_name.trim());
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (is_public !== undefined) {
      updates.push(`is_public = $${paramIndex++}`);
      values.push(is_public);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(deck_id);

    const result = await db.query(
      `UPDATE decks SET ${updates.join(', ')} WHERE deck_id = $${paramIndex}
       RETURNING deck_id, user_id, deck_name, description, is_public, created_at, updated_at`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update deck error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteDeck = async (req, res) => {
  try {
    const { deck_id } = req.params;

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

    await db.query('DELETE FROM decks WHERE deck_id = $1', [deck_id]);

    res.json({ message: 'Deck deleted successfully' });
  } catch (error) {
    console.error('Delete deck error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllDecks,
  getDeckById,
  createDeck,
  updateDeck,
  deleteDeck,
};
