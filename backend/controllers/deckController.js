const db = require('../db');

// GET /api/decks
// When is_public=true, returns all public decks.
// Otherwise returns decks the user owns plus any assigned to them via user_decks.
const getAllDecks = async (req, res) => {
  try {
    const { is_public } = req.query;

    let query;
    let params;

    if (is_public === 'true') {
      query = `
        SELECT d.deck_id, d.user_id, d.deck_name, d.description, d.is_public,
               d.total_cards, d.unique_cards, d.shuffle_behaviour, d.duplicate_handling,
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
      // Return decks the user owns OR has been assigned via user_decks library
      query = `
        SELECT d.deck_id, d.user_id, d.deck_name, d.description, d.is_public,
               d.total_cards, d.unique_cards, d.shuffle_behaviour, d.duplicate_handling,
               d.created_at, d.updated_at,
               COALESCE(SUM(dc.quantity), 0)::int AS card_count
        FROM decks d
        LEFT JOIN deck_cards dc ON d.deck_id = dc.deck_id
        WHERE d.user_id = $1
           OR d.deck_id IN (SELECT deck_id FROM user_decks WHERE user_id = $1)
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

// GET /api/decks/:deck_id
// Returns a deck with its full card list. Private decks are only accessible to their owner.
const getDeckById = async (req, res) => {
  try {
    const { deck_id } = req.params;

    const deckResult = await db.query(
      `SELECT d.deck_id, d.user_id, d.deck_name, d.description, d.is_public,
              d.total_cards, d.unique_cards, d.shuffle_behaviour, d.duplicate_handling,
              d.attributes, d.created_at, d.updated_at, u.username
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
      `SELECT c.card_id, c.card_name, c.front_text, c.front_image_url,
              c.back_text, c.back_image_url, c.default_copies, c.is_unique,
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

// POST /api/decks
// Creates a new deck owned by the authenticated user
const createDeck = async (req, res) => {
  try {
    const {
      deck_name,
      description,
      is_public,
      total_cards,
      unique_cards,
      shuffle_behaviour,
      duplicate_handling,
      attributes,
    } = req.body;

    if (!deck_name || deck_name.trim() === '') {
      return res.status(400).json({ error: 'Deck name is required' });
    }

    if (deck_name.length > 100) {
      return res.status(400).json({ error: 'Deck name must be 100 characters or less' });
    }

    const result = await db.query(
      `INSERT INTO decks (user_id, deck_name, description, is_public, total_cards, unique_cards, shuffle_behaviour, duplicate_handling, attributes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING deck_id, deck_name, description, is_public, total_cards, unique_cards, shuffle_behaviour, duplicate_handling, attributes, created_at`,
      [
        req.user.userId,
        deck_name.trim(),
        description || null,
        is_public || false,
        total_cards || null,
        unique_cards || null,
        shuffle_behaviour || 'shuffle_before_game',
        duplicate_handling || 'allow_duplicates',
        attributes ? JSON.stringify(attributes) : '{}',
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create deck error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// PUT /api/decks/:deck_id
// Updates only the fields that were provided (partial update)
const updateDeck = async (req, res) => {
  try {
    const { deck_id } = req.params;
    const {
      deck_name,
      description,
      is_public,
      total_cards,
      unique_cards,
      shuffle_behaviour,
      duplicate_handling,
      attributes,
    } = req.body;

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

    // Build the SET clause dynamically so untouched fields are never overwritten
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
    if (total_cards !== undefined) {
      updates.push(`total_cards = $${paramIndex++}`);
      values.push(total_cards);
    }
    if (unique_cards !== undefined) {
      updates.push(`unique_cards = $${paramIndex++}`);
      values.push(unique_cards);
    }
    if (shuffle_behaviour !== undefined) {
      updates.push(`shuffle_behaviour = $${paramIndex++}`);
      values.push(shuffle_behaviour);
    }
    if (duplicate_handling !== undefined) {
      updates.push(`duplicate_handling = $${paramIndex++}`);
      values.push(duplicate_handling);
    }
    if (attributes !== undefined) {
      updates.push(`attributes = $${paramIndex++}`);
      values.push(JSON.stringify(attributes));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(deck_id);

    const result = await db.query(
      `UPDATE decks SET ${updates.join(', ')} WHERE deck_id = $${paramIndex}
       RETURNING deck_id, user_id, deck_name, description, is_public, total_cards, unique_cards, shuffle_behaviour, duplicate_handling, attributes, created_at, updated_at`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update deck error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// DELETE /api/decks/:deck_id
// If the user owns the deck, it is permanently deleted.
// If they only have it in their library (user_decks), it is removed from their library only.
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

    if (deckResult.rows[0].user_id === req.user.userId) {
      await db.query('DELETE FROM decks WHERE deck_id = $1', [deck_id]);
      return res.json({ message: 'Deck deleted successfully' });
    }

    // User does not own it, remove it from their personal library
    const assignmentResult = await db.query(
      'DELETE FROM user_decks WHERE user_id = $1 AND deck_id = $2 RETURNING user_deck_id',
      [req.user.userId, deck_id]
    );

    if (assignmentResult.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied. You do not own this deck.' });
    }

    res.json({ message: 'Deck removed from your library' });
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
