import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Guard ficticio que siempre permite el acceso. Evita que el ThrottlerGuard
 * global inicie temporizadores o almacenes que bloqueen el cierre de Jest.
 */
class FakeGuard {
  canActivate() {
    return true;
  }
}

/**
 * Interceptor ficticio que pasa la petición directamente al handler.
 * Evita que el AuditInterceptor real escriba en la base de datos durante los tests.
 */
class FakeInterceptor {
  intercept(context: any, next: any) {
    return next.handle();
  }
}

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
      })
      .overrideProvider(APP_GUARD)
      .useClass(FakeGuard)
      .overrideProvider(APP_INTERCEPTOR)
      .useClass(FakeInterceptor)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health returns ok', async () => {
    const response = await request(app.getHttpServer()).get('/api/health').expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.database.status).toBe('up');
    expect(response.body.demo_mode).toBe(true);
  });

  it('GET /api/auth/me rejects requests without a token', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });
});
