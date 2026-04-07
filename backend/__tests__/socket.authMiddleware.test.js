const jwt = require('jsonwebtoken');
const authenticateSocket = require('../socket/authMiddleware');

jest.mock('jsonwebtoken');

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = 'test-secret';
});

const mockSocket = (token) => ({
  handshake: { auth: { token } },
  user: null,
});

describe('authenticateSocket', () => {
  it('should call next with error if no token provided', () => {
    const socket = mockSocket(undefined);
    const next = jest.fn();

    authenticateSocket(socket, next);

    expect(next).toHaveBeenCalledWith(new Error('Authentication required'));
  });

  it('should call next with error if token is invalid', () => {
    jwt.verify.mockImplementation((token, secret, cb) => cb(new Error('invalid'), null));

    const socket = mockSocket('bad-token');
    const next = jest.fn();

    authenticateSocket(socket, next);

    expect(next).toHaveBeenCalledWith(new Error('Invalid or expired token'));
  });

  it('should attach user to socket and call next on valid token', () => {
    const user = { userId: 1, username: 'testuser' };
    jwt.verify.mockImplementation((token, secret, cb) => cb(null, user));

    const socket = mockSocket('valid-token');
    const next = jest.fn();

    authenticateSocket(socket, next);

    expect(socket.user).toEqual(user);
    expect(next).toHaveBeenCalledWith();
  });
});
