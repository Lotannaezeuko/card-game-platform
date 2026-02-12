const jwt = require('jsonwebtoken');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

jest.mock('jsonwebtoken');

const mockReq = (overrides = {}) => ({
  headers: {},
  ...overrides,
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = () => jest.fn();

describe('authenticateToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  it('should return 401 if no authorization header is present', () => {
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 if authorization header has no token', () => {
    const req = mockReq({ headers: { authorization: 'Bearer ' } });
    const res = mockRes();
    const next = mockNext();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
  });

  it('should return 403 if token is invalid', () => {
    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(new Error('invalid token'), null);
    });

    const req = mockReq({ headers: { authorization: 'Bearer invalid-token' } });
    const res = mockRes();
    const next = mockNext();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should set req.user and call next if token is valid', () => {
    const userData = { userId: 1, username: 'testuser', email: 'test@test.com' };
    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(null, userData);
    });

    const req = mockReq({ headers: { authorization: 'Bearer valid-token' } });
    const res = mockRes();
    const next = mockNext();

    authenticateToken(req, res, next);

    expect(req.user).toEqual(userData);
    expect(next).toHaveBeenCalled();
  });
});

describe('optionalAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  it('should call next without setting req.user if no token is present', () => {
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    optionalAuth(req, res, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });

  it('should set req.user and call next if token is valid', () => {
    const userData = { userId: 1, username: 'testuser', email: 'test@test.com' };
    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(null, userData);
    });

    const req = mockReq({ headers: { authorization: 'Bearer valid-token' } });
    const res = mockRes();
    const next = mockNext();

    optionalAuth(req, res, next);

    expect(req.user).toEqual(userData);
    expect(next).toHaveBeenCalled();
  });

  it('should call next without setting req.user if token is invalid', () => {
    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(new Error('invalid'), null);
    });

    const req = mockReq({ headers: { authorization: 'Bearer bad-token' } });
    const res = mockRes();
    const next = mockNext();

    optionalAuth(req, res, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });
});
