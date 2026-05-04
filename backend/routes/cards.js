const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const cardController = require('../controllers/cardController');

const router = express.Router();

// All card routes require authentication
router.get('/', authenticateToken, cardController.getAllCards);
router.get('/:card_id', authenticateToken, cardController.getCardById);
router.post('/', authenticateToken, cardController.createCard);
router.put('/:card_id', authenticateToken, cardController.updateCard);
router.delete('/:card_id', authenticateToken, cardController.deleteCard);

module.exports = router;
