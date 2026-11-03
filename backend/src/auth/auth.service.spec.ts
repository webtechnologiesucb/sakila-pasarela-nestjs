import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
  } as any;

  const jwtService = {
    sign: jest.fn((payload: any) => `signed-${payload.type}`),
    verifyAsync: jest.fn(),
  } as any;

  const configService = {
    get: jest.fn((key: string, fallback?: string) =>
      key === 'JWT_SECRET' ? 'test-secret-value-123456' : fallback,
    ),
  } as any;

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(prisma, jwtService, configService);
  });

  it('returns the user without password hash for valid credentials', async () => {
    const password_hash = await bcrypt.hash('Password@123', 4);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'ADMIN',
      is_active: true,
      password_hash,
    });

    const user = await service.validateUser('ADMIN@example.com', 'Password@123');

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'admin@example.com' },
    });
    expect(user).not.toHaveProperty('password_hash');
  });

  it('rejects invalid passwords', async () => {
    const password_hash = await bcrypt.hash('Password@123', 4);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      is_active: true,
      password_hash,
    });

    await expect(
      service.validateUser('admin@example.com', 'wrong-password'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects inactive users', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      is_active: false,
      password_hash: 'whatever',
    });

    await expect(
      service.validateUser('admin@example.com', 'Password@123'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('issues an access token and a refresh token on login', async () => {
    const result = await service.login({
      id: 'user-1',
      email: 'admin@example.com',
      name: 'Admin',
      role: 'ADMIN',
    });

    expect(result.access_token).toBe('signed-access');
    expect(result.refresh_token).toBe('signed-refresh');
    expect(result.token_type).toBe('Bearer');
    expect(result.user.id).toBe('user-1');
    expect(jwtService.sign).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: 'refresh' }),
      expect.objectContaining({ secret: 'test-secret-value-123456' }),
    );
    expect(jwtService.sign).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: 'access' }),
    );
  });

  it('rejects an invalid refresh token', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid token'));

    await expect(service.refresh('bad-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
