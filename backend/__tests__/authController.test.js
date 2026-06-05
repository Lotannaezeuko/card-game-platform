const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { register, login, getMe, updatePassword, refreshToken } = require('../controllers/authController');

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../db');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_EXPIRES_IN = '1h';
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

describe('register', () => {
  it('should return 400 if username is missing', async () => {
    const req = { body: { email: 'test@test.com', password: 'password123' } };
    const res = mockRes();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Username, email, and password are required' });
  });

  it('should return 400 if email is missing', async () => {
    const req = { body: { username: 'testuser', password: 'password123' } };
    const res = mockRes();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Username, email, and password are required' });
  });

  it('should return 400 if password is missing', async () => {
    const req = { body: { username: 'testuser', email: 'test@test.com' } };
    const res = mockRes();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 400 if password is too short', async () => {
    const req = { body: { username: 'testuser', email: 'test@test.com', password: 'short' } };
    const res = mockRes();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Password must be at least 8 characters' });
  });

  it('should return 400 if email format is invalid', async () => {
    const req = { body: { username: 'testuser', email: 'not-an-email', password: 'password123' } };
    const res = mockRes();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid email format' });
  });

  it('should return 409 if user already exists', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ user_id: 1 }] });

    const req = { body: { username: 'testuser', email: 'test@test.com', password: 'password123' } };
    const res = mockRes();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Username or email already exists' });
  });

  it('should register user successfully', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })  // no existing user
      .mockResolvedValueOnce({              // insert user
        rows: [{ user_id: 1, username: 'testuser', email: 'test@test.com', created_at: '2024-01-01' }],
      })
      .mockResolvedValueOnce({ rows: [{ deck_id: 99 }] }) // standard deck lookup
      .mockResolvedValueOnce({});                          // user_decks insert

    bcrypt.hash.mockResolvedValue('hashed-password');
    jwt.sign.mockReturnValue('mock-token');

    const req = { body: { username: 'testuser', email: 'test@test.com', password: 'password123' } };
    const res = mockRes();

    await register(req, res);

    expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'User registered successfully',
      user: {
        userId: 1,
        username: 'testuser',
        email: 'test@test.com',
        createdAt: '2024-01-01',
      },
      token: 'mock-token',
    });
  });

  it('should assign Standard Playing Cards deck to new user on registration', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ user_id: 1, username: 'testuser', email: 'test@test.com', created_at: '2024-01-01' }],
      })
      .mockResolvedValueOnce({ rows: [{ deck_id: 99 }] })
      .mockResolvedValueOnce({});

    bcrypt.hash.mockResolvedValue('hashed-password');
    jwt.sign.mockReturnValue('mock-token');

    const req = { body: { username: 'testuser', email: 'test@test.com', password: 'password123' } };
    const res = mockRes();

    await register(req, res);

    const deckLookupQuery = db.query.mock.calls[2][0];
    expect(deckLookupQuery).toContain('Standard Playing Cards');

    const userDecksInsertParams = db.query.mock.calls[3][1];
    expect(userDecksInsertParams).toEqual([1, 99]);
  });

  it('should register successfully when Standard Playing Cards deck does not exist yet', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ user_id: 1, username: 'testuser', email: 'test@test.com', created_at: '2024-01-01' }],
      })
      .mockResolvedValueOnce({ rows: [] }); // no standard deck found — skip user_decks insert

    bcrypt.hash.mockResolvedValue('hashed-password');
    jwt.sign.mockReturnValue('mock-token');

    const req = { body: { username: 'testuser', email: 'test@test.com', password: 'password123' } };
    const res = mockRes();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    // Only 3 db calls — no user_decks insert since deck wasn't found
    expect(db.query).toHaveBeenCalledTimes(3);
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB connection failed'));

    const req = { body: { username: 'testuser', email: 'test@test.com', password: 'password123' } };
    const res = mockRes();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });
});

describe('login', () => {
  it('should return 400 if email is missing', async () => {
    const req = { body: { password: 'password123' } };
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Email and password are required' });
  });

  it('should return 400 if password is missing', async () => {
    const req = { body: { email: 'test@test.com' } };
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Email and password are required' });
  });

  it('should return 401 if user not found', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const req = { body: { email: 'notfound@test.com', password: 'password123' } };
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid email or password' });
  });

  it('should return 401 if password is incorrect', async () => {
    db.query.mockResolvedValue({
      rows: [{ user_id: 1, username: 'testuser', email: 'test@test.com', password_hash: 'hashed' }],
    });
    bcrypt.compare.mockResolvedValue(false);

    const req = { body: { email: 'test@test.com', password: 'wrongpassword' } };
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid email or password' });
  });

  it('should login successfully with valid credentials', async () => {
    db.query.mockResolvedValue({
      rows: [{ user_id: 1, username: 'testuser', email: 'test@test.com', password_hash: 'hashed' }],
    });
    bcrypt.compare.mockResolvedValue(true);
    jwt.sign.mockReturnValue('mock-token');

    const req = { body: { email: 'test@test.com', password: 'password123' } };
    const res = mockRes();

    await login(req, res);

    expect(res.json).toHaveBeenCalledWith({
      message: 'Login successful',
      user: { userId: 1, username: 'testuser', email: 'test@test.com' },
      token: 'mock-token',
    });
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const req = { body: { email: 'test@test.com', password: 'password123' } };
    const res = mockRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('getMe', () => {
  it('should return current user profile', async () => {
    db.query.mockResolvedValue({
      rows: [{ user_id: 1, username: 'testuser', email: 'test@test.com', created_at: '2024-01-01', updated_at: null }],
    });

    const req = { user: { userId: 1 } };
    const res = mockRes();

    await getMe(req, res);

    expect(res.json).toHaveBeenCalledWith({
      userId: 1,
      username: 'testuser',
      email: 'test@test.com',
      createdAt: '2024-01-01',
      updatedAt: null,
    });
  });

  it('should return 404 if user not found', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const req = { user: { userId: 999 } };
    const res = mockRes();

    await getMe(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
  });

  it('should return 500 on database error', async () => {
    db.query.mockRejectedValue(new Error('DB error'));

    const req = { user: { userId: 1 } };
    const res = mockRes();

    await getMe(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('updatePassword', () => {
  it('should return 400 if current password is missing', async () => {
    const req = { body: { newPassword: 'newpass123' }, user: { userId: 1 } };
    const res = mockRes();

    await updatePassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Current password and new password are required' });
  });

  it('should return 400 if new password is missing', async () => {
    const req = { body: { currentPassword: 'oldpass123' }, user: { userId: 1 } };
    const res = mockRes();

    await updatePassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 400 if new password is too short', async () => {
    const req = { body: { currentPassword: 'oldpass123', newPassword: 'short' }, user: { userId: 1 } };
    const res = mockRes();

    await updatePassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'New password must be at least 8 characters' });
  });

  it('should return 404 if user not found', async () => {
    db.query.mockResolvedValue({ rows: [] });

    const req = { body: { currentPassword: 'oldpass123', newPassword: 'newpass123' }, user: { userId: 999 } };
    const res = mockRes();

    await updatePassword(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return 401 if current password is incorrect', async () => {
    db.query.mockResolvedValue({ rows: [{ password_hash: 'hashed' }] });
    bcrypt.compare.mockResolvedValue(false);

    const req = { body: { currentPassword: 'wrongpass', newPassword: 'newpass123' }, user: { userId: 1 } };
    const res = mockRes();

    await updatePassword(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Current password is incorrect' });
  });

  it('should update password successfully', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ password_hash: 'old-hashed' }] })
      .mockResolvedValueOnce({});

    bcrypt.compare.mockResolvedValue(true);
    bcrypt.hash.mockResolvedValue('new-hashed');

    const req = { body: { currentPassword: 'oldpass123', newPassword: 'newpass123' }, user: { userId: 1 } };
    const res = mockRes();

    await updatePassword(req, res);

    expect(bcrypt.hash).toHaveBeenCalledWith('newpass123', 10);
    expect(res.json).toHaveBeenCalledWith({ message: 'Password updated successfully' });
  });
});

describe('refreshToken', () => {
  it('should return a new token', () => {
    jwt.sign.mockReturnValue('new-mock-token');

    const req = { user: { userId: 1, username: 'testuser', email: 'test@test.com' } };
    const res = mockRes();

    refreshToken(req, res);

    expect(jwt.sign).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ token: 'new-mock-token' });
  });
});
