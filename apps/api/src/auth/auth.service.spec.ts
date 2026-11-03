import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { RefreshSession } from './schemas/refresh-session.schema.js';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
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
  let auditService: { logAction: ReturnType<typeof vi.fn> };

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

    refreshModel = vi.fn().mockImplementation(function (data: any) {
      return {
        ...data,
        id: 'new-session-id',
        save: vi.fn().mockResolvedValue({ id: 'new-session-id' }),
      };
    });
    refreshModel.findOne = vi.fn();
    refreshModel.findById = vi.fn();
    refreshModel.findOneAndUpdate = vi.fn();
    auditService = { logAction: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: AuditService, useValue: auditService },
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

  describe('login roles', () => {
    const account = (role: string, roles?: string[]) =>
      ({ id: '507f1f77bcf86cd799439011', isActive: true, passwordHash: 'hash', role, roles }) as any;
    const signIn = (audience: 'CAMPUS' | 'RECRUITER' = 'CAMPUS') =>
      service.login({ email: 'a@b.com', password: 'pw' }, undefined, undefined, audience);

    beforeEach(() => {
      vi.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
    });

    it.each(['student', 'faculty', 'placement_officer', 'placement_head', 'admin'])(
      'signs a single-role %s account straight into its role',
      async (role) => {
        vi.spyOn(usersService, 'findByEmail').mockResolvedValue(account(role));
        const result = await signIn();
        expect(result).toMatchObject({ activeRole: role, roles: [role], requiresRoleSelection: false });
        expect(jwtService.sign).toHaveBeenCalledWith({ sub: '507f1f77bcf86cd799439011', sid: 'new-session-id', role });
      },
    );

    it('asks a multi-role account to choose, with no role in the token', async () => {
      vi.spyOn(usersService, 'findByEmail').mockResolvedValue(account('faculty', ['placement_officer']));
      const result = await signIn();
      expect(result).toMatchObject({ activeRole: null, roles: ['faculty', 'placement_officer'], requiresRoleSelection: true });
      expect(jwtService.sign).toHaveBeenCalledWith({ sub: '507f1f77bcf86cd799439011', sid: 'new-session-id' });
    });

    it('keeps recruiters out of the campus login and campus users out of the recruiter login', async () => {
      vi.spyOn(usersService, 'findByEmail').mockResolvedValue(account('recruiter'));
      await expect(signIn('CAMPUS')).rejects.toThrow(ForbiddenException);
      expect((await signIn('RECRUITER')).activeRole).toBe('recruiter');

      vi.spyOn(usersService, 'findByEmail').mockResolvedValue(account('student'));
      await expect(signIn('RECRUITER')).rejects.toThrow(ForbiddenException);
    });

    it('never lets a recruiter hold campus roles', async () => {
      vi.spyOn(usersService, 'findByEmail').mockResolvedValue(account('recruiter', ['admin']));
      expect((await signIn('RECRUITER')).roles).toEqual(['recruiter']);
    });
  });

  describe('setActiveRole', () => {
    const userId = '507f1f77bcf86cd799439011';
    const sessionId = '507f1f77bcf86cd799439022';
    const liveSession = () => ({
      id: sessionId,
      userId: { toString: () => userId },
      audience: 'CAMPUS',
      expiresAt: new Date(Date.now() + 60_000),
      save: vi.fn(),
    });

    beforeEach(() => {
      vi.spyOn(usersService, 'findById').mockResolvedValue({ id: userId, isActive: true, role: 'faculty', roles: ['placement_officer'] } as any);
    });

    it('rejects a role the user does not hold', async () => {
      await expect(service.setActiveRole(userId, sessionId, 'admin')).rejects.toThrow(ForbiddenException);
    });

    it('rejects a session that belongs to someone else', async () => {
      refreshModel.findById.mockResolvedValue({ ...liveSession(), userId: { toString: () => 'other' } });
      await expect(service.setActiveRole(userId, sessionId, 'faculty')).rejects.toThrow(UnauthorizedException);
    });

    it('rotates the session into the chosen role and audits it', async () => {
      const session = liveSession();
      refreshModel.findById.mockResolvedValue(session);
      const result = await service.setActiveRole(userId, sessionId, 'placement_officer');
      expect(session.save).toHaveBeenCalled();
      expect((session as any).revokedAt).toBeInstanceOf(Date);
      expect(jwtService.sign).toHaveBeenCalledWith({ sub: userId, sid: 'new-session-id', role: 'placement_officer' });
      expect(refreshModel).toHaveBeenCalledWith(expect.objectContaining({ activeRole: 'placement_officer', rotatedFrom: sessionId }));
      expect(auditService.logAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'AUTH_ACTIVE_ROLE_SWITCHED' }));
      expect(result.accessToken).toBe('access-token');
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
