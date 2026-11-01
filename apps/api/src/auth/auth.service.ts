import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import { RegisterDto, LoginDto } from './dto/auth.dto.js';
import {
  RefreshSession,
  RefreshSessionDocument,
} from './schemas/refresh-session.schema.js';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
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

  async login(loginDto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.passwordHash);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.usersService.updateLastLogin(user.id);

    return this.generateAuthResponse(user.id, user.role);
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

    return this.generateAuthResponse(user.id, user.role, session.id);
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

  private async generateAuthResponse(
    userId: string,
    role: string,
    rotatedFrom?: string,
  ) {
    const payload = { sub: userId, role };
    const accessToken = this.jwtService.sign(payload);

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
      rotatedFrom,
    });

    await newSession.save();

    return {
      accessToken,
      refreshToken, // This will be sent as httpOnly cookie in the controller
    };
  }
}
