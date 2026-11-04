import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@placecampus/shared-types';
import { UsersService, assignedRoles } from '../users/users.service.js';
import { UserDocument } from '../users/schemas/user.schema.js';
import { AuditService } from '../audit/audit.service.js';
import { RegisterDto, LoginDto } from './dto/auth.dto.js';
import {
  RefreshSession,
  RefreshSessionDocument,
} from './schemas/refresh-session.schema.js';
import * as crypto from 'crypto';

export type AuthAudience = 'CAMPUS' | 'RECRUITER';

/** Same message for unknown email, wrong password and inactive accounts. */
const INVALID_CREDENTIALS = 'Email or password is incorrect';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditService: AuditService,
    @InjectModel(RefreshSession.name)
    private refreshSessionModel: Model<RefreshSessionDocument>,
  ) {}

  async register(registerDto: RegisterDto) {
    const salt = await bcrypt.genSalt();
    const passwordHash = await bcrypt.hash(registerDto.password, salt);

    const user = await this.usersService.createStudent(
      registerDto.fullName,
      registerDto.email,
      passwordHash,
    );

    return {
      message: 'Registration successful',
      user: this.usersService.sanitize(user),
    };
  }

  /**
   * Campus and recruiter logins are separate endpoints. The role always comes
   * from the account's role assignments, never from the request.
   */
  async login(
    loginDto: LoginDto,
    ip?: string,
    userAgent?: string,
    audience: AuthAudience = 'CAMPUS',
  ) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user || !user.isActive) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.passwordHash);

    if (!isMatch) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    // The password is already proven, so naming the right sign-in page leaks nothing.
    const isRecruiter = user.role === UserRole.RECRUITER;
    if (audience === 'CAMPUS' && isRecruiter) {
      throw new ForbiddenException(
        'This is a recruiter account. Please sign in through Recruiter access.',
      );
    }
    if (audience === 'RECRUITER' && !isRecruiter) {
      throw new ForbiddenException(
        'This is a campus account. Please sign in through the campus login.',
      );
    }

    await this.usersService.updateLastLogin(user.id);

    const roles = assignedRoles(user);
    const activeRole = roles.length === 1 ? roles[0] : undefined;
    const tokens = await this.generateAuthResponse(user.id, {
      audience,
      activeRole,
      mustChangePassword: !!user.mustChangePassword,
    });

    return {
      ...tokens,
      user: this.usersService.sanitize(user),
      roles,
      activeRole: activeRole ?? null,
      requiresRoleSelection: !activeRole,
      mustChangePassword: !!user.mustChangePassword,
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');
    const session = await this.refreshSessionModel.findOne({ tokenHash });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (session.revokedAt) {
      // Possible token reuse attack - we could optionally revoke ALL sessions for this user here
      throw new UnauthorizedException('Session has been revoked');
    }

    if (new Date() > session.expiresAt) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Revoke the old session
    session.revokedAt = new Date();
    await session.save();

    const user = await this.usersService.findById(session.userId.toString());
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User no longer active');
    }

    return this.generateAuthResponse(user.id, {
      audience: session.audience ?? 'CAMPUS',
      activeRole: this.resolveActiveRole(user, session.activeRole),
      rotatedFrom: session.id,
      mustChangePassword: !!user.mustChangePassword,
    });
  }

  /**
   * Switches a multi-role user's session to another of their own role
   * assignments. The current session is rotated so the old role's tokens die.
   */
  async setActiveRole(userId: string, sessionId: string | undefined, role: UserRole) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User no longer active');
    }
    if (!assignedRoles(user).includes(role)) {
      throw new ForbiddenException('You do not hold this role.');
    }

    const session =
      sessionId && Types.ObjectId.isValid(sessionId)
        ? await this.refreshSessionModel.findById(sessionId)
        : null;
    if (
      !session ||
      session.userId.toString() !== user.id ||
      session.revokedAt ||
      new Date() > session.expiresAt
    ) {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }

    session.revokedAt = new Date();
    await session.save();

    await this.auditService.logAction({
      actorId: user.id,
      actorRole: role,
      action: 'AUTH_ACTIVE_ROLE_SWITCHED',
      resourceType: 'USER',
      resourceId: user.id,
      metadata: { from: session.activeRole ?? null, to: role },
    });

    return this.generateAuthResponse(user.id, {
      audience: session.audience ?? 'CAMPUS',
      activeRole: role,
      rotatedFrom: session.id,
      mustChangePassword: !!user.mustChangePassword,
    });
  }

  /**
   * Replaces the caller's password (required after a temporary password).
   * Other sessions are revoked; the current one is rotated with fresh tokens.
   */
  async changePassword(userId: string, sessionId: string | undefined, currentPassword: string, newPassword: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.isActive) throw new UnauthorizedException('User no longer active');
    const matches = await bcrypt.compare(currentPassword, user.passwordHash).catch(() => false);
    if (!matches) throw new BadRequestException('Your current password is incorrect.');
    if (newPassword.length < 12 || newPassword.length > 128) {
      throw new BadRequestException('Choose a password of 12 to 128 characters.');
    }
    if (newPassword === currentPassword) throw new BadRequestException('Choose a password different from the temporary one.');
    if (newPassword.toLowerCase().includes(user.email.split('@')[0].toLowerCase())) {
      throw new BadRequestException('Your password must not contain your email name.');
    }

    user.passwordHash = await bcrypt.hash(newPassword, await bcrypt.genSalt());
    user.mustChangePassword = false;
    user.temporaryPasswordIssuedAt = undefined;
    await user.save();

    const session = sessionId && Types.ObjectId.isValid(sessionId) ? await this.refreshSessionModel.findById(sessionId) : null;
    await this.refreshSessionModel.updateMany(
      { userId: new Types.ObjectId(userId), revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
    );
    await this.auditService.logAction({
      actorId: userId, actorRole: user.role, action: 'AUTH_PASSWORD_CHANGED', resourceType: 'USER', resourceId: userId,
    });
    return this.generateAuthResponse(userId, {
      audience: session?.audience ?? 'CAMPUS',
      activeRole: this.resolveActiveRole(user, session?.activeRole),
      rotatedFrom: session?.id,
      mustChangePassword: false,
    });
  }

  /** Role state of the current access token, for `/auth/me`. */
  describeRoles(user: UserDocument, tokenRole?: string) {
    const roles = assignedRoles(user);
    const activeRole = this.resolveActiveRole(user, tokenRole) ?? null;
    return { roles, activeRole, requiresRoleSelection: !activeRole };
  }

  async logout(refreshToken: string) {
    if (!refreshToken) return;

    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');
    await this.refreshSessionModel.findOneAndUpdate(
      { tokenHash },
      { revokedAt: new Date() },
    );
  }

  /**
   * Single-role users always act as that role (this also covers sessions
   * created before role selection existed). Multi-role users keep their chosen
   * role only while they still hold it.
   */
  private resolveActiveRole(user: UserDocument, requested?: string) {
    const roles = assignedRoles(user);
    if (roles.length === 1) return roles[0];
    return roles.find((role) => role === requested);
  }

  private async generateAuthResponse(
    userId: string,
    options: {
      audience: AuthAudience;
      activeRole?: UserRole;
      rotatedFrom?: string;
      mustChangePassword?: boolean;
    },
  ) {
    // Generate random refresh token
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const expiresInDays = this.configService.get<number>(
      'JWT_REFRESH_EXPIRES_DAYS',
      7,
    );
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const newSession = new this.refreshSessionModel({
      userId: new Types.ObjectId(userId),
      tokenHash,
      expiresAt,
      rotatedFrom: options.rotatedFrom,
      audience: options.audience,
      activeRole: options.activeRole,
    });

    await newSession.save();

    // No role claim until a multi-role user picks one, so RBAC denies everything.
    const payload: Record<string, unknown> = { sub: userId, sid: newSession.id };
    if (options.activeRole) payload.role = options.activeRole;
    // Temporary password: the API refuses everything except changing it.
    if (options.mustChangePassword) payload.pwc = true;
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      refreshToken, // This will be sent as httpOnly cookie in the controller
    };
  }
}
