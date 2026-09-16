import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

/**
 * Response shape matching ApiResponse<T> from shared-types.
 */
interface StandardResponse<T> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

/**
 * Global response interceptor that wraps all successful responses
 * into the standardized ApiResponse<T> shape.
 *
 * Before: { name: "John" }
 * After:  { success: true, data: { name: "John" }, timestamp: "..." }
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, StandardResponse<T>> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<StandardResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
