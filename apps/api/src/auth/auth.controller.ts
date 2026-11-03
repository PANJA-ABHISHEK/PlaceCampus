import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  SetActiveRoleDto,
} from './dto/auth.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { CurrentUser } from './decorators/current-user.decorator.js';

function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/v1/auth/refresh',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

/** The login payload: tokens stay in the cookie, never in the body. */
function loginBody({ refreshToken, ...result }: Awaited<ReturnType<AuthService['login']>>) {
  return { message: 'Login successful', ...result };
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new student account' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Campus login (Student, Faculty, Placement Officer, Placement Head, Administrator)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Login successful: { accessToken, user, roles, activeRole, requiresRoleSelection }',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Recruiter account: use /recruiter/auth/login' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(
      loginDto,
      req.ip,
      req.headers['user-agent'],
      'CAMPUS',
    );
    setRefreshCookie(res, result.refreshToken);
    return loginBody(result);
  }

  @Post('active-role')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Switch the session to another of your own role assignments' })
  @ApiResponse({ status: 200, description: 'New tokens issued for the chosen role' })
  @ApiResponse({ status: 403, description: 'Role not assigned to this user' })
  async setActiveRole(
    @CurrentUser() user: any,
    @Body() dto: SetActiveRoleDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.setActiveRole(
      user.userId,
      user.sessionId,
      dto.role,
    );
    setRefreshCookie(res, result.refreshToken);
    return { accessToken: result.accessToken, activeRole: dto.role };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('refreshToken')
  @ApiOperation({ summary: 'Refresh access token using httpOnly cookie' })
  @ApiResponse({ status: 200, description: 'Token successfully refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;
    const result = await this.authService.refresh(refreshToken);
    setRefreshCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and clear session' })
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refreshToken;
    await this.authService.logout(refreshToken);

    res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });

    return { message: 'Logged out successfully' };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset' })
  @ApiResponse({
    status: 200,
    description: 'If an account exists, a reset link will be sent',
  })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    // For now, return safe generic message. Implement email later.
    return {
      message:
        'If an account exists for this email, reset instructions will be provided.',
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: any) {
    const fullUser = await this.usersService.findById(user.userId);
    if (!fullUser) return { user: null };
    const access = this.authService.describeRoles(fullUser, user.role);
    return {
      // `role` is the role this session acts as, so portal guards keep working.
      user: {
        ...this.usersService.sanitize(fullUser),
        role: access.activeRole ?? fullUser.role,
        ...access,
      },
    };
  }
}

@ApiTags('Authentication')
@Controller('recruiter/auth')
export class RecruiterAuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recruiter login (separate from campus login)' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Campus account: use /auth/login' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(
      loginDto,
      req.ip,
      req.headers['user-agent'],
      'RECRUITER',
    );
    setRefreshCookie(res, result.refreshToken);
    return loginBody(result);
  }
}
