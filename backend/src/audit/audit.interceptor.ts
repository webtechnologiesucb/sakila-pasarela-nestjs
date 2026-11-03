import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const SENSITIVE_KEYS = [
  'password',
  'password_hash',
  'current_password',
  'new_password',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'test_token',
];

/**
 * Automatically records successful and failed mutating requests. This keeps
 * an audit trail without requiring each controller/service to write its own
 * audit code. Read-only requests are intentionally ignored.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();

    if (!request || !MUTATING_METHODS.has(request.method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: (response) => {
          void this.persist(request, { response });
        },
        error: (error) => {
          void this.persist(request, { error });
        },
      }),
    );
  }

  private async persist(
    request: any,
    result: { response?: any; error?: any },
  ): Promise<void> {
    const rawPath: string = (request.originalUrl || request.url || '').split('?')[0];
    const segments = rawPath.split('/').filter(Boolean);
    // /api/<entity>/<id>/...
    const entityType = segments[1] || 'unknown';
    const entityId =
      request.params?.id ||
      result.response?.id ||
      result.response?.data?.id ||
      null;

    const newValues: Record<string, unknown> = {
      status: result.error ? 'FAILED' : 'SUCCESS',
      ...(result.error && { error: result.error.message }),
      ...(request.body &&
        typeof request.body === 'object' && {
          payload: this.sanitize(request.body),
        }),
    };

    await this.auditService.record({
      userId: request.user?.sub || request.user?.id || null,
      action: `${request.method} ${rawPath}`,
      entityType,
      entityId,
      newValues,
      ipAddress: request.ip || request.socket?.remoteAddress || null,
      userAgent: request.headers?.['user-agent'] || null,
    });
  }

  private sanitize(value: any): any {
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item));
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => {
          if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
            return [key, '[REDACTED]'];
          }
          return [key, this.sanitize(entry)];
        }),
      );
    }

    return value;
  }
}
