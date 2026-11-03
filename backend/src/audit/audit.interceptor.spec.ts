import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';

function createContext(method: string, body: any = {}): ExecutionContext {
  const request = {
    method,
    originalUrl: '/api/payments?x=1',
    url: '/api/payments',
    params: {},
    body,
    user: { sub: 'user-1' },
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    headers: { 'user-agent': 'jest' },
  };

  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('AuditInterceptor', () => {
  const auditService = { record: jest.fn().mockResolvedValue(undefined) } as any;
  const next: CallHandler = { handle: () => of({ id: 'txn-1' }) };

  beforeEach(() => jest.clearAllMocks());

  it('does not record read-only requests', (done) => {
    const interceptor = new AuditInterceptor(auditService);

    interceptor.intercept(createContext('GET'), next).subscribe(() => {
      setTimeout(() => {
        expect(auditService.record).not.toHaveBeenCalled();
        done();
      }, 0);
    });
  });

  it('records mutating requests and redacts sensitive fields', (done) => {
    const interceptor = new AuditInterceptor(auditService);

    interceptor
      .intercept(
        createContext('POST', {
          amount: 5,
          test_token: 'tok_secret',
          nested: { password: 'PlainText123' },
        }),
        next,
      )
      .subscribe(() => {
        setTimeout(() => {
          expect(auditService.record).toHaveBeenCalledTimes(1);
          const entry = auditService.record.mock.calls[0][0];
          expect(entry.userId).toBe('user-1');
          expect(entry.action).toBe('POST /api/payments');
          expect(entry.entityType).toBe('payments');
          expect(entry.entityId).toBe('txn-1');
          expect(entry.newValues.payload.test_token).toBe('[REDACTED]');
          expect(entry.newValues.payload.nested.password).toBe('[REDACTED]');
          done();
        }, 0);
      });
  });
});
