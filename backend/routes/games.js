const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const gameController = require('../controllers/gameController');

const router = express.Router();

router.get('/', authenticateToken, gameController.getAllGames);
router.get('/:game_id', authenticateToken, gameController.getGameById);
router.post('/', authenticateToken, gameController.createGame);
router.put('/:game_id/state', authenticateToken, gameController.updateGameState);
router.put('/:game_id/end', authenticateToken, gameController.endGame);
router.post('/:game_id/players', authenticateToken, gameController.addPlayerToGame);
router.delete('/:game_id/players/:game_player_id', authenticateToken, gameController.removePlayerFromGame);

module.exports = router;
