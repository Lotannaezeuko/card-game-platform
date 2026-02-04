const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticateToken, authController.getMe);
router.put('/password', authenticateToken, authController.updatePassword);
router.post('/refresh', authenticateToken, authController.refreshToken);

module.exports = router;
