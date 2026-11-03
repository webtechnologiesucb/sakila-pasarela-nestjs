import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn'],
  });

  // ─── Global prefix ─────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ─── CORS ──────────────────────────────────────────────────
  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Idempotency-Key',
    ],
    credentials: true,
  });

  // ─── Validation ────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── Exception filter ──────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableShutdownHooks();

  // ─── Swagger ───────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('Sakila Payment Gateway API')
    .setDescription(
      '⚠️ ENTORNO DE DEMOSTRACIÓN - No procesa dinero real.\n\n' +
      'API REST para la pasarela de pagos simulada basada en la base de datos Sakila. ' +
      'Implementa gestión de clientes, catálogo de películas, órdenes, pagos simulados y reembolsos.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT',
    )
    .addTag('auth', 'Autenticación y autorización')
    .addTag('users', 'Gestión de usuarios administrativos')
    .addTag('customers', 'Clientes del videoclub')
    .addTag('films', 'Catálogo de películas')
    .addTag('orders', 'Gestión de órdenes')
    .addTag('payments', 'Procesamiento de pagos simulados')
    .addTag('refunds', 'Gestión de reembolsos')
    .addTag('reports', 'Reportes y estadísticas')
    .addTag('audit', 'Registro de auditoría')
    .addTag('health', 'Estado del servicio')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`\n🚀 Sakila Payment Gateway API running on port ${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api/docs`);
  console.log(`⚠️  DEMO ENVIRONMENT - No real money is processed.\n`);
}
bootstrap();
