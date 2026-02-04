const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const deckController = require('../controllers/deckController');
const cardController = require('../controllers/cardController');

const router = express.Router();

router.get('/', authenticateToken, deckController.getAllDecks);
router.get('/:deck_id', authenticateToken, deckController.getDeckById);
router.post('/', authenticateToken, deckController.createDeck);
router.put('/:deck_id', authenticateToken, deckController.updateDeck);
router.delete('/:deck_id', authenticateToken, deckController.deleteDeck);

// Deck-card management
router.post('/:deck_id/cards', authenticateToken, cardController.addCardToDeck);
router.delete('/:deck_id/cards/:card_id', authenticateToken, cardController.removeCardFromDeck);

module.exports = router;
