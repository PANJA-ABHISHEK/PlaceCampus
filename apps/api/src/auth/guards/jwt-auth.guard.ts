import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Routes a user with a temporary password may still call. */
const PASSWORD_CHANGE_ALLOWED = ['/auth/me', '/auth/change-password', '/auth/logout', '/auth/refresh'];

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(err: any, user: any, info: any, context: ExecutionContext): TUser {
    const result = super.handleRequest(err, user, info, context) as any;
    // Temporary password: nothing else works until it has been changed.
    if (result?.mustChangePassword) {
      const path: string = context.switchToHttp().getRequest().path ?? '';
      if (!PASSWORD_CHANGE_ALLOWED.some((allowed) => path.endsWith(allowed))) {
        throw new ForbiddenException('Change your temporary password before continuing.');
      }
    }
    return result;
  }
}
