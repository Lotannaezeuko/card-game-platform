const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const gameController = require('../controllers/gameController');
const gameActionsController = require('../controllers/gameActionsController');

const router = express.Router();

router.post('/join', authenticateToken, gameController.joinByCode);
router.get('/', authenticateToken, gameController.getAllGames);
router.get('/:game_id', authenticateToken, gameController.getGameById);
router.post('/', authenticateToken, gameController.createGame);
router.put('/:game_id/state', authenticateToken, gameController.updateGameState);
router.put('/:game_id/turn', authenticateToken, gameController.adjustTurn);
router.put('/:game_id/end', authenticateToken, gameController.endGame);
router.post('/:game_id/players', authenticateToken, gameController.addPlayerToGame);
router.delete('/:game_id/players/:game_player_id', authenticateToken, gameController.removePlayerFromGame);

router.get('/:game_id/hand', authenticateToken, gameActionsController.getPlayerHand);
router.post('/:game_id/deal', authenticateToken, gameActionsController.dealStartingHand);
router.post('/:game_id/draw', authenticateToken, gameActionsController.drawCard);
router.post('/:game_id/play', authenticateToken, gameActionsController.playCard);
router.post('/:game_id/board', authenticateToken, gameActionsController.placeCardOnBoard);
router.post('/:game_id/pass', authenticateToken, gameActionsController.passTurn);
router.post('/:game_id/reshuffle', authenticateToken, gameActionsController.reshuffleDeck);
router.put('/:game_id/score', authenticateToken, gameActionsController.updateScore);
router.get('/:game_id/scores', authenticateToken, gameActionsController.getFinalScores);
router.put('/:game_id/session/end', authenticateToken, gameActionsController.endSession);

module.exports = router;
