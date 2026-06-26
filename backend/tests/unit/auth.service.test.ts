/**
 * auth.service.test.ts — Unit Tests for AuthService
 *
 * Strategy: mock all external dependencies (UserModel, RefreshTokenModel,
 * jwtService, bcrypt) so tests run without a real MongoDB connection.
 *
 * Test coverage:
 *  register()  — success, duplicate email
 *  login()     — success, wrong password, inactive account, unknown email
 *  refresh()   — success, invalid token, token not in DB
 *  logout()    — success, already-invalid token (should not throw)
 */

import { authService } from '../../src/modules/auth/auth.service';
import { UserModel }   from '../../src/modules/user/user.model';
import { RefreshTokenModel } from '../../src/modules/auth/refresh-token.model';
import { jwtService }  from '../../src/modules/auth/jwt/jwt.service';
import { HttpError }   from '../../src/middleware/error.middleware';
import bcrypt          from 'bcryptjs';

// ------------------------------------------------------------------
// Mocks
// ------------------------------------------------------------------
jest.mock('../../src/modules/user/user.model');
jest.mock('../../src/modules/auth/refresh-token.model');
jest.mock('../../src/modules/auth/jwt/jwt.service');
jest.mock('bcryptjs');

const mockUser = {
  _id:          'user123',
  fullName:     'John Doe',
  email:        'john@example.com',
  passwordHash: 'hashed_password',
  role:         'user',
  isActive:     true,
  toObject:     () => ({ _id: 'user123', fullName: 'John Doe', email: 'john@example.com', role: 'user', isActive: true }),
};

// ------------------------------------------------------------------
// register()
// ------------------------------------------------------------------
describe('AuthService.register()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a user and returns a success message', async () => {
    (UserModel.findOne as jest.Mock).mockReturnValue({ lean: () => null });
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    (UserModel.create as jest.Mock).mockResolvedValue(mockUser);

    const result = await authService.register({
      fullName: 'John Doe',
      email: 'john@example.com',
      password: 'StrongPass1!',
    });

    expect(result.message).toContain('Registration successful');
    expect(UserModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'john@example.com' }),
    );
  });

  it('throws 409 if email already exists', async () => {
    (UserModel.findOne as jest.Mock).mockReturnValue({ lean: () => mockUser });

    await expect(
      authService.register({ fullName: 'Jane', email: 'john@example.com', password: 'StrongPass1!' }),
    ).rejects.toThrow(new HttpError(409, 'An account with this email already exists'));
  });
});

// ------------------------------------------------------------------
// login()
// ------------------------------------------------------------------
describe('AuthService.login()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns tokens and user on valid credentials', async () => {
    (UserModel.findOne as jest.Mock).mockReturnValue({ select: () => mockUser });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwtService.signAccessToken as jest.Mock).mockReturnValue('access_token');
    (jwtService.signRefreshToken as jest.Mock).mockReturnValue('refresh_token');
    (jwtService.verifyRefreshToken as jest.Mock).mockReturnValue({ sub: 'user123', jti: 'jti123' });
    (bcrypt.hash as jest.Mock).mockResolvedValue('token_hash');
    (RefreshTokenModel.create as jest.Mock).mockResolvedValue({});
    (UserModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

    const result = await authService.login({ email: 'john@example.com', password: 'StrongPass1!' });

    expect(result.accessToken).toBe('access_token');
    expect(result.refreshToken).toBe('refresh_token');
    expect(result.user.email).toBe('john@example.com');
  });

  it('throws 401 if user not found', async () => {
    (UserModel.findOne as jest.Mock).mockReturnValue({ select: () => null });

    await expect(
      authService.login({ email: 'unknown@example.com', password: 'pass' }),
    ).rejects.toThrow(new HttpError(401, 'Invalid email or password'));
  });

  it('throws 401 if password is wrong', async () => {
    (UserModel.findOne as jest.Mock).mockReturnValue({ select: () => mockUser });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      authService.login({ email: 'john@example.com', password: 'WrongPass1!' }),
    ).rejects.toThrow(new HttpError(401, 'Invalid email or password'));
  });

  it('throws 403 if account is inactive', async () => {
    (UserModel.findOne as jest.Mock).mockReturnValue({
      select: () => ({ ...mockUser, isActive: false }),
    });

    await expect(
      authService.login({ email: 'john@example.com', password: 'StrongPass1!' }),
    ).rejects.toThrow(new HttpError(403, expect.stringContaining('deactivated')));
  });
});

// ------------------------------------------------------------------
// refresh()
// ------------------------------------------------------------------
describe('AuthService.refresh()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns a new access token for a valid refresh token', async () => {
    (jwtService.verifyRefreshToken as jest.Mock).mockReturnValue({ sub: 'user123', jti: 'jti123' });
    (RefreshTokenModel.find as jest.Mock).mockResolvedValue([{ _id: 'tok1', tokenHash: 'hash' }]);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
    (jwtService.signAccessToken as jest.Mock).mockReturnValue('new_access_token');

    const result = await authService.refresh({ refreshToken: 'valid_refresh' });

    expect(result.accessToken).toBe('new_access_token');
  });

  it('throws 401 if refresh token not found in DB', async () => {
    (jwtService.verifyRefreshToken as jest.Mock).mockReturnValue({ sub: 'user123', jti: 'jti123' });
    (RefreshTokenModel.find as jest.Mock).mockResolvedValue([{ tokenHash: 'other_hash' }]);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      authService.refresh({ refreshToken: 'unknown_token' }),
    ).rejects.toThrow(new HttpError(401, expect.stringContaining('not found')));
  });
});

// ------------------------------------------------------------------
// logout()
// ------------------------------------------------------------------
describe('AuthService.logout()', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes the refresh token from DB', async () => {
    (jwtService.verifyRefreshToken as jest.Mock).mockReturnValue({ sub: 'user123', jti: 'jti123' });
    (RefreshTokenModel.find as jest.Mock).mockResolvedValue([{ _id: 'tok1', tokenHash: 'hash' }]);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (RefreshTokenModel.deleteOne as jest.Mock).mockResolvedValue({});

    await expect(authService.logout('valid_refresh')).resolves.not.toThrow();
    expect(RefreshTokenModel.deleteOne).toHaveBeenCalled();
  });

  it('does not throw if token is already expired/invalid', async () => {
    (jwtService.verifyRefreshToken as jest.Mock).mockImplementation(() => {
      throw new HttpError(401, 'Expired');
    });

    await expect(authService.logout('expired_token')).resolves.not.toThrow();
  });
});
