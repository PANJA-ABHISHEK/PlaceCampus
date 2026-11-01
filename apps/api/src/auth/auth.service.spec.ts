import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { RefreshSession } from './schemas/refresh-session.schema.js';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

vi.mock('bcrypt', () => ({
  genSalt: vi.fn(),
  hash: vi.fn(),
  compare: vi.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: Partial<UsersService>;
  let jwtService: Partial<JwtService>;
  let configService: Partial<ConfigService>;
  let refreshModel: any;

  beforeEach(async () => {
    usersService = {
      createStudent: vi.fn(),
      findByEmail: vi.fn(),
      findById: vi.fn(),
      updateLastLogin: vi.fn(),
      sanitize: vi.fn(),
    };

    jwtService = {
      sign: vi.fn().mockReturnValue('access-token'),
    };

    configService = {
      get: vi.fn().mockReturnValue(7),
    };

    refreshModel = function () {
      return {
        save: vi.fn().mockResolvedValue({ id: 'session-id' }),
      };
    };
    refreshModel.findOne = vi.fn();
    refreshModel.findOneAndUpdate = vi.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: getModelToken(RefreshSession.name), useValue: refreshModel },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should throw UnauthorizedException for invalid email', async () => {
      vi.spyOn(usersService, 'findByEmail').mockResolvedValue(null);
      await expect(
        service.login({ email: 'test@test.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      vi.spyOn(usersService, 'findByEmail').mockResolvedValue({
        id: '1',
        isActive: true,
        passwordHash: 'hash',
        role: 'student',
      } as any);
      vi.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      await expect(
        service.login({ email: 'test@test.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should throw if no refresh token', async () => {
      await expect(service.refresh('')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if token not found', async () => {
      refreshModel.findOne.mockResolvedValue(null);
      await expect(service.refresh('token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw if token revoked', async () => {
      refreshModel.findOne.mockResolvedValue({ revokedAt: new Date() });
      await expect(service.refresh('token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw if token expired', async () => {
      refreshModel.findOne.mockResolvedValue({
        expiresAt: new Date(Date.now() - 10000),
      });
      await expect(service.refresh('token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('register', () => {
    it('should successfully register a user', async () => {
      vi.spyOn(bcrypt, 'genSalt').mockResolvedValue('salt' as never);
      vi.spyOn(bcrypt, 'hash').mockResolvedValue('hash' as never);

      const mockUser = { id: '1', email: 'test@test.com', fullName: 'Test' };
      vi.spyOn(usersService, 'createStudent').mockResolvedValue(
        mockUser as any,
      );
      vi.spyOn(usersService, 'sanitize').mockReturnValue(mockUser as any);

      const result = await service.register({
        email: 'test@test.com',
        fullName: 'Test',
        password: 'password',
      });

      expect(result.user).toEqual(mockUser);
    });
  });
});
