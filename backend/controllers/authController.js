const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');

const SALT_ROUNDS = 10;

const generateToken = (user) => {
  return jwt.sign(
    { userId: user.user_id, username: user.username, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const existingUser = await db.query(
      'SELECT user_id FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase(), username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await db.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING user_id, username, email, created_at`,
      [username, email.toLowerCase(), passwordHash]
    );

    const user = result.rows[0];

    // Auto-assign the Standard Playing Cards deck to every new user
    // and copy all 52 cards into their personal card library
    const standardDeck = await db.query(
      `SELECT deck_id FROM decks WHERE deck_name = 'Standard Playing Cards' AND is_public = true LIMIT 1`
    );
    if (standardDeck.rows.length > 0) {
      const deckId = standardDeck.rows[0].deck_id;

      await db.query(
        'INSERT INTO user_decks (user_id, deck_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [user.user_id, deckId]
      );

      // Copy each card in the standard deck into the new user's card library
      await db.query(
        `INSERT INTO cards
           (created_by_user_id, card_name, front_text, front_image_url,
            back_text, back_image_url, default_copies, is_unique, attributes)
         SELECT $1, c.card_name, c.front_text, c.front_image_url,
                c.back_text, c.back_image_url, c.default_copies, c.is_unique, c.attributes
         FROM deck_cards dc
         JOIN cards c ON c.card_id = dc.card_id
         WHERE dc.deck_id = $2`,
        [user.user_id, deckId]
      );
    }

    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        userId: user.user_id,
        username: user.username,
        email: user.email,
        createdAt: user.created_at,
      },
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await db.query(
      'SELECT user_id, username, email, password_hash FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      user: {
        userId: user.user_id,
        username: user.username,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getMe = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT user_id, username, email, created_at, updated_at FROM users WHERE user_id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      userId: user.user_id,
      username: user.username,
      email: user.email,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const result = await db.query(
      'SELECT password_hash FROM users WHERE user_id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
      [newPasswordHash, req.user.userId]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const refreshToken = (req, res) => {
  const token = generateToken({
    user_id: req.user.userId,
    username: req.user.username,
    email: req.user.email,
  });

  res.json({ token });
};

const guest = async (req, res) => {
  try {
    const { username, game_code } = req.body;

    if (!username || !game_code) {
      return res.status(400).json({ error: 'Username and game code are required' });
    }

    const result = await db.query(
      'SELECT game_id, status FROM games WHERE game_code = $1',
      [game_code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const game = result.rows[0];

    if (game.status === 'ended') {
      return res.status(400).json({ error: 'This game has already ended' });
    }

    const guestId = crypto.randomUUID();
    const token = jwt.sign(
      { userId: null, username, guestId, isGuest: true },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      token,
      guest: { guestId, username, gameId: game.game_id },
    });
  } catch (error) {
    console.error('Guest auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  register,
  login,
  guest,
  getMe,
  updatePassword,
  refreshToken,
};
