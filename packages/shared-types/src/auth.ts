// ============================================
// Authentication & Authorization Types
// ============================================

/**
 * User roles for RBAC.
 * Each role has distinct permissions and access levels.
 */
export enum UserRole {
  STUDENT = 'STUDENT',
  FACULTY = 'FACULTY',
  PLACEMENT_OFFICER = 'PLACEMENT_OFFICER',
  PLACEMENT_HEAD = 'PLACEMENT_HEAD',
  RECRUITER = 'RECRUITER',
  ADMIN = 'ADMIN',
}

/**
 * Login request payload.
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Registration request payload.
 */
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

/**
 * Authentication tokens returned after successful login.
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * JWT access token payload.
 */
export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/**
 * Refresh token request payload.
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Password reset request.
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password reset confirmation.
 */
export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

/**
 * Auth session info for the current user.
 */
export interface AuthSession {
  userId: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}
