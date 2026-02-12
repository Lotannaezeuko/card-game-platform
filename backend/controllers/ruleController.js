const db = require('../db');
const { ruleComponents } = require('../config/ruleComponents');

const validateConfig = (component, rule_config) => {
  const errors = [];

  for (const [field, schema] of Object.entries(component.config_schema)) {
    const value = rule_config[field];

    if (schema.type === 'number') {
      if (value === undefined || value === null) {
        errors.push(`${schema.label} is required`);
        continue;
      }
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        errors.push(`${schema.label} must be a number`);
        continue;
      }
      if (value < schema.min) {
        errors.push(`${schema.label} must be at least ${schema.min}`);
      }
      if (value > schema.max) {
        errors.push(`${schema.label} must be at most ${schema.max}`);
      }
    }

    if (schema.type === 'select') {
      if (value === undefined || value === null) {
        errors.push(`${schema.label} is required`);
        continue;
      }
      const validValues = schema.options.map((opt) =>
        typeof opt === 'string' ? opt : opt.value
      );
      if (!validValues.includes(value)) {
        errors.push(`${schema.label} must be one of: ${validValues.join(', ')}`);
      }
    }

    if (schema.type === 'textarea') {
      if (value !== undefined && typeof value !== 'string') {
        errors.push(`${schema.label} must be a string`);
      }
    }
  }

  return errors;
};

const getComponents = (req, res) => {
  try {
    const { category } = req.query;

    if (category) {
      const filtered = ruleComponents.filter((c) => c.category === category);
      return res.json({ components: filtered, category });
    }

    res.json({ components: ruleComponents });
  } catch (error) {
    console.error('Get components error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getRulesByDeck = async (req, res) => {
  try {
    const { deck_id } = req.params;

    const deckResult = await db.query(
      'SELECT user_id, is_public FROM decks WHERE deck_id = $1',
      [deck_id]
    );

    if (deckResult.rows.length === 0) {
      return res.status(404).json({ error: 'Deck not found' });
    }

    const deck = deckResult.rows[0];

    if (!deck.is_public && deck.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied. This deck is private.' });
    }

    const result = await db.query(
      'SELECT * FROM game_rules WHERE deck_id = $1 ORDER BY created_at ASC',
      [deck_id]
    );

    res.json({ rules: result.rows });
  } catch (error) {
    console.error('Get rules by deck error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createRule = async (req, res) => {
  try {
    const { deck_id } = req.params;
    const { component_id, rule_config, rule_name } = req.body;

    if (!component_id) {
      return res.status(400).json({ error: 'Component ID is required' });
    }

    if (!rule_config || typeof rule_config !== 'object') {
      return res.status(400).json({ error: 'Rule config is required and must be an object' });
    }

    const component = ruleComponents.find((c) => c.id === component_id);
    if (!component) {
      return res.status(400).json({ error: `Unknown component: ${component_id}` });
    }

    const validationErrors = validateConfig(component, rule_config);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors.join('; ') });
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

    const result = await db.query(
      `INSERT INTO game_rules (deck_id, rule_name, rule_type, rule_config)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [deck_id, rule_name || component.name, component_id, JSON.stringify(rule_config)]
    );

    res.status(201).json({ rule: result.rows[0] });
  } catch (error) {
    console.error('Create rule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateRule = async (req, res) => {
  try {
    const { rule_id } = req.params;
    const { rule_config, rule_name } = req.body;

    const ruleResult = await db.query(
      `SELECT gr.*, d.user_id FROM game_rules gr
       JOIN decks d ON gr.deck_id = d.deck_id
       WHERE gr.rule_id = $1`,
      [rule_id]
    );

    if (ruleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    const rule = ruleResult.rows[0];

    if (rule.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied. You do not own this deck.' });
    }

    if (rule_config) {
      if (typeof rule_config !== 'object') {
        return res.status(400).json({ error: 'Rule config must be an object' });
      }

      const component = ruleComponents.find((c) => c.id === rule.rule_type);
      if (component) {
        const validationErrors = validateConfig(component, rule_config);
        if (validationErrors.length > 0) {
          return res.status(400).json({ error: validationErrors.join('; ') });
        }
      }
    }

    const result = await db.query(
      `UPDATE game_rules SET rule_config = $1, rule_name = $2
       WHERE rule_id = $3
       RETURNING *`,
      [
        JSON.stringify(rule_config || rule.rule_config),
        rule_name || rule.rule_name,
        rule_id,
      ]
    );

    res.json({ rule: result.rows[0] });
  } catch (error) {
    console.error('Update rule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteRule = async (req, res) => {
  try {
    const { rule_id } = req.params;

    const ruleResult = await db.query(
      `SELECT gr.*, d.user_id FROM game_rules gr
       JOIN decks d ON gr.deck_id = d.deck_id
       WHERE gr.rule_id = $1`,
      [rule_id]
    );

    if (ruleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    if (ruleResult.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied. You do not own this deck.' });
    }

    await db.query('DELETE FROM game_rules WHERE rule_id = $1', [rule_id]);

    res.json({ message: 'Rule deleted successfully' });
  } catch (error) {
    console.error('Delete rule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getComponents,
  getRulesByDeck,
  createRule,
  updateRule,
  deleteRule,
};
