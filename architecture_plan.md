# Plan de Arquitectura - Sakila Pasarela de Pagos

## Stack Confirmado
- Node.js v20.19.4 / npm 10.8.2
- Docker 29.9.2 / Docker Compose v5.6.1
- Backend: NestJS + TypeScript + Prisma ORM
- Frontend: React + TypeScript + Vite
- DB: PostgreSQL 17

## Estructura de Directorios

```
sakila-pasarela-nestjs/
├── backend/                    # NestJS API
│   ├── src/
│   │   ├── auth/              # JWT auth, guards, roles
│   │   ├── users/             # Admin users
│   │   ├── customers/         # Sakila customers
│   │   ├── films/             # Sakila films/catalog
│   │   ├── orders/            # Order management
│   │   ├── payments/          # Payment processing
│   │   ├── refunds/           # Refund management
│   │   ├── reports/           # Aggregated reports
│   │   ├── audit/             # Audit logs
│   │   ├── simulator/         # Payment simulation engine
│   │   ├── prisma/            # Prisma service
│   │   └── common/            # Shared pipes, guards, decorators
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── test/
│   ├── Dockerfile
│   └── package.json
├── frontend/                   # React + Vite
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Route pages
│   │   ├── services/          # HTTP API layer
│   │   ├── hooks/             # Custom hooks
│   │   ├── store/             # State management
│   │   └── types/             # TypeScript types
│   ├── Dockerfile
│   └── package.json
├── database/
│   ├── migrations/            # SQL migration files
│   ├── seeds/                 # Sakila seed data
│   └── init.sql               # Initial schema
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
├── .gitignore
└── README.md
```

## Decisiones Técnicas Clave

1. **ORM**: Prisma (única herramienta de migraciones)
2. **Auth**: JWT con refresh tokens, bcrypt para passwords
3. **Simulador**: Determinista basado en reglas + número aleatorio seed
4. **Idempotencia**: Clave `idempotency_key` en payment_transactions (UNIQUE)
5. **Monedas**: DECIMAL(19,4) en PostgreSQL
6. **Paginación**: Cursor-based para listas grandes, offset para reportes
7. **Rate limiting**: @nestjs/throttler en auth endpoints
8. **CORS**: Whitelist explícita desde .env

## Fases de Implementación

- [x] Fase 1: Inspección y planificación
- [x] Fase 2: Esquema PostgreSQL, migraciones Prisma, seeds Sakila
- [x] Fase 3: Backend NestJS - Auth, Customers, Films, Orders
- [x] Fase 4: Payments, Simulator, Refunds, Audit
- [x] Fase 5: Frontend React/Vite - todas las vistas
- [x] Fase 6: Docker Compose integración completa
- [x] Fase 7: Tests, correcciones, documentación final

## Estado de Implementación

- Backend NestJS con módulos `auth`, `users`, `customers`, `films`, `orders`,
  `payments`, `refunds`, `reports`, `audit` y `health`.
- Autenticación JWT con access token + refresh token, bcrypt y roles
  (`ADMIN`, `STAFF`, `VIEWER`), rate limiting y CORS configurable.
- Migración inicial de Prisma en `backend/prisma/migrations/20260101000000_init`
  y seed idempotente en `backend/prisma/seed.ts`.
- Adaptación a rieles de pago de Bolivia: moneda `BOB`, locale `es-BO` y
  métodos `QR_SIMPLE` (ASFI), `TIGO_MONEY`, `ENTEL_MONEY`, `BANK_TRANSFER`
  (BCP/BNB) y `CARD_BO` (VisaNet Bolivia). La migración
  `20261102000000_bolivia_payment_gateways` agrega `provider`,
  `provider_reference` y `payer_identifier`, convierte importes USD → BOB
  (1 USD = 6,96 BOB) y desactiva los métodos `SIMULATED_*`.
- Simulador de pagos determinista por proveedor, con validación de celulares
  bolivianos para Tigo/Entel Money y referencias por riel
  (`QR-ASFI-*`, `TIGO-*`, `TRF-BCP-*`, `VN-BO-*`). El identificador del
  pagador se almacena enmascarado.
- Simulador de pagos determinista, idempotencia por `idempotency_key`,
  reembolsos parciales/totales y auditoría automática de mutaciones.
- Frontend React/Vite con login, dashboard, clientes, películas, órdenes,
  detalle de orden, pagos, reembolsos, reportes, usuarios y auditoría.
- Dockerfiles multi-stage, `docker-compose.yml` (producción demo) y
  `docker-compose.dev.yml` (hot reload). El stack de producción fue validado de
  extremo a extremo: build de imágenes, migraciones y seed automáticos,
  healthchecks, proxy de nginx y flujo de pago/reembolso.
- Filtros de listado validados con DTOs en `backend/src/common/dto/filter.dto.ts`,
  compatibles con la `ValidationPipe` global (`whitelist` +
  `forbidNonWhitelisted`).
- El cliente HTTP del frontend renueva el access token automáticamente, incluso
  al validar la sesión con `GET /api/auth/me`.
- Tests unitarios y e2e en `backend/src/**/*.spec.ts` y `backend/test/`.
- Documentación de uso y credenciales demo en `README.md`.

