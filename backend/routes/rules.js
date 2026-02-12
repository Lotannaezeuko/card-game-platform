const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const ruleController = require('../controllers/ruleController');

const router = express.Router();

// Get available rule components (no auth required)
router.get('/components', ruleController.getComponents);

// Deck-scoped rule routes (auth required)
router.get('/decks/:deck_id', authenticateToken, ruleController.getRulesByDeck);
router.post('/decks/:deck_id', authenticateToken, ruleController.createRule);

// Rule-specific routes (auth required)
router.put('/:rule_id', authenticateToken, ruleController.updateRule);
router.delete('/:rule_id', authenticateToken, ruleController.deleteRule);

module.exports = router;
