const db = require('../db');

const VALID_CARD_TYPES = ['character', 'spell', 'item', 'event', 'location'];
const DEFAULT_LIMIT = 50;

const getAllCards = async (req, res) => {
  try {
    const { card_type, created_by, limit, offset } = req.query;

    const queryLimit = Math.min(parseInt(limit) || DEFAULT_LIMIT, 100);
    const queryOffset = parseInt(offset) || 0;

    let query = `
      SELECT c.card_id, c.card_name, c.card_type, c.content, c.image_url,
             c.attributes, c.created_at, c.updated_at,
             c.created_by_user_id, u.username AS creator_username
      FROM cards c
      LEFT JOIN users u ON c.created_by_user_id = u.user_id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (card_type) {
      query += ` AND c.card_type = $${paramIndex++}`;
      params.push(card_type);
    }

    if (created_by) {
      query += ` AND c.created_by_user_id = $${paramIndex++}`;
      params.push(created_by);
    }

    query += ` ORDER BY c.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(queryLimit, queryOffset);

    const result = await db.query(query, params);

    const countQuery = `
      SELECT COUNT(*) FROM cards c
      WHERE 1=1
      ${card_type ? 'AND c.card_type = $1' : ''}
      ${created_by ? `AND c.created_by_user_id = $${card_type ? 2 : 1}` : ''}
    `;
    const countParams = [];
    if (card_type) countParams.push(card_type);
    if (created_by) countParams.push(created_by);

    const countResult = await db.query(countQuery, countParams);

    res.json({
      cards: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        limit: queryLimit,
        offset: queryOffset,
      },
    });
  } catch (error) {
    console.error('Get all cards error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getCardById = async (req, res) => {
  try {
    const { card_id } = req.params;

    const result = await db.query(
      `SELECT c.card_id, c.card_name, c.card_type, c.content, c.image_url,
              c.attributes, c.created_at, c.updated_at,
              c.created_by_user_id, u.username AS creator_username, u.email AS creator_email
       FROM cards c
       LEFT JOIN users u ON c.created_by_user_id = u.user_id
       WHERE c.card_id = $1`,
      [card_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get card by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createCard = async (req, res) => {
  try {
    const { card_name, card_type, content, image_url, attributes } = req.body;

    if (!card_name || card_name.trim() === '') {
      return res.status(400).json({ error: 'Card name is required' });
    }

    if (!card_type) {
      return res.status(400).json({ error: 'Card type is required' });
    }

    if (!VALID_CARD_TYPES.includes(card_type)) {
      return res.status(400).json({
        error: `Invalid card type. Must be one of: ${VALID_CARD_TYPES.join(', ')}`,
      });
    }

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Card content is required' });
    }

    const result = await db.query(
      `INSERT INTO cards (created_by_user_id, card_name, card_type, content, image_url, attributes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING card_id, card_name, card_type, content, image_url, attributes, created_at`,
      [
        req.user.userId,
        card_name.trim(),
        card_type,
        content.trim(),
        image_url || null,
        attributes ? JSON.stringify(attributes) : '{}',
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create card error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateCard = async (req, res) => {
  try {
    const { card_id } = req.params;
    const { card_name, card_type, content, image_url, attributes } = req.body;

    const cardResult = await db.query(
      'SELECT created_by_user_id FROM cards WHERE card_id = $1',
      [card_id]
    );

    if (cardResult.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    if (cardResult.rows[0].created_by_user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied. You are not the card creator.' });
    }

    if (card_type && !VALID_CARD_TYPES.includes(card_type)) {
      return res.status(400).json({
        error: `Invalid card type. Must be one of: ${VALID_CARD_TYPES.join(', ')}`,
      });
    }

    if (card_name !== undefined && card_name.trim() === '') {
      return res.status(400).json({ error: 'Card name cannot be empty' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (card_name !== undefined) {
      updates.push(`card_name = $${paramIndex++}`);
      values.push(card_name.trim());
    }
    if (card_type !== undefined) {
      updates.push(`card_type = $${paramIndex++}`);
      values.push(card_type);
    }
    if (content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(content.trim());
    }
    if (image_url !== undefined) {
      updates.push(`image_url = $${paramIndex++}`);
      values.push(image_url);
    }
    if (attributes !== undefined) {
      updates.push(`attributes = $${paramIndex++}`);
      values.push(JSON.stringify(attributes));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(card_id);

    const result = await db.query(
      `UPDATE cards SET ${updates.join(', ')} WHERE card_id = $${paramIndex}
       RETURNING card_id, card_name, card_type, content, image_url, attributes, created_at, updated_at`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update card error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteCard = async (req, res) => {
  try {
    const { card_id } = req.params;

    const cardResult = await db.query(
      'SELECT created_by_user_id FROM cards WHERE card_id = $1',
      [card_id]
    );

    if (cardResult.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    if (cardResult.rows[0].created_by_user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied. You are not the card creator.' });
    }

    const deckUsageResult = await db.query(
      'SELECT deck_id FROM deck_cards WHERE card_id = $1 LIMIT 1',
      [card_id]
    );

    if (deckUsageResult.rows.length > 0) {
      return res.status(409).json({
        error: 'Cannot delete card. It is currently used in one or more decks.',
      });
    }

    await db.query('DELETE FROM cards WHERE card_id = $1', [card_id]);

    res.json({ message: 'Card deleted successfully' });
  } catch (error) {
    console.error('Delete card error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const addCardToDeck = async (req, res) => {
  try {
    const { deck_id } = req.params;
    const { card_id, quantity } = req.body;

    if (!card_id) {
      return res.status(400).json({ error: 'Card ID is required' });
    }

    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be greater than 0' });
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

    const cardResult = await db.query(
      'SELECT card_id FROM cards WHERE card_id = $1',
      [card_id]
    );

    if (cardResult.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const existingResult = await db.query(
      'SELECT deck_card_id, quantity FROM deck_cards WHERE deck_id = $1 AND card_id = $2',
      [deck_id, card_id]
    );

    let result;
    if (existingResult.rows.length > 0) {
      result = await db.query(
        `UPDATE deck_cards SET quantity = $1 WHERE deck_id = $2 AND card_id = $3
         RETURNING deck_card_id, deck_id, card_id, quantity, card_order`,
        [quantity, deck_id, card_id]
      );
    } else {
      const maxOrderResult = await db.query(
        'SELECT COALESCE(MAX(card_order), 0) + 1 AS next_order FROM deck_cards WHERE deck_id = $1',
        [deck_id]
      );
      const nextOrder = maxOrderResult.rows[0].next_order;

      result = await db.query(
        `INSERT INTO deck_cards (deck_id, card_id, quantity, card_order)
         VALUES ($1, $2, $3, $4)
         RETURNING deck_card_id, deck_id, card_id, quantity, card_order`,
        [deck_id, card_id, quantity, nextOrder]
      );
    }

    res.status(existingResult.rows.length > 0 ? 200 : 201).json(result.rows[0]);
  } catch (error) {
    console.error('Add card to deck error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const removeCardFromDeck = async (req, res) => {
  try {
    const { deck_id, card_id } = req.params;

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

    const deleteResult = await db.query(
      'DELETE FROM deck_cards WHERE deck_id = $1 AND card_id = $2 RETURNING deck_card_id',
      [deck_id, card_id]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Card not found in this deck' });
    }

    res.json({ message: 'Card removed from deck successfully' });
  } catch (error) {
    console.error('Remove card from deck error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getAllCards,
  getCardById,
  createCard,
  updateCard,
  deleteCard,
  addCardToDeck,
  removeCardFromDeck,
};
