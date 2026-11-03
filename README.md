# Sakila Payment Gateway (Demo)

Pasarela de pagos **simulada** construida sobre el catálogo de la base de datos
de ejemplo **Sakila**. Permite gestionar clientes, películas, órdenes, pagos y
reembolsos, con autenticación JWT, roles, idempotencia, auditoría y reportes.

> ⚠️ **Entorno de demostración.** No se procesa dinero real, no se almacenan
> datos de tarjetas y el simulador es determinista. No use este proyecto en
> producción sin sustituir el simulador por un proveedor real.

## Stack

| Capa | Tecnología |
| --- | --- |
| Backend | NestJS 10 + TypeScript |
| ORM | Prisma 5 |
| Base de datos | PostgreSQL 17 |
| Frontend | React 18 + TypeScript + Vite |
| Auth | JWT (access + refresh), bcrypt, roles |
| Infra | Docker / Docker Compose |
| Docs API | Swagger/OpenAPI |

## Pasarelas y rieles de pago de Bolivia

La demo está adaptada a medios de pago bolivianos y opera en **BOB**
(bolivianos), con locale `es-BO`. Todos los rieles son **simulados**: no se
contacta a ningún proveedor real ni se procesa dinero.

| Código | Método | Proveedor simulado | Requisito |
| --- | --- | --- | --- |
| `QR_SIMPLE` | QR Simple (ASFI) | ASFI / QR Simple | — |
| `TIGO_MONEY` | Tigo Money | Tigo Money | Celular boliviano |
| `ENTEL_MONEY` | Entel Money | Entel Money | Celular boliviano |
| `BANK_TRANSFER` | Transferencia bancaria | BCP / BNB | — |
| `CARD_BO` | Tarjeta Visa/Mastercard | VisaNet Bolivia | — |

Los celulares de Tigo Money y Entel Money deben tener 8 dígitos, iniciar con
`6` o `7` y aceptan el prefijo `+591` (ej. `71234567` o `+59171234567`). El
número se guarda **enmascarado** en `payment_transactions.payer_identifier`.

Cada transacción registra además:

- `payment_method.provider`: proveedor simulado del riel.
- `payment_transactions.provider_reference`: referencia emitida por el
  proveedor simulado (ej. `QR-ASFI-...`, `TIGO-...`, `TRF-BCP-...`).
- `payment_transactions.payer_identifier`: identificador enmascarado del
  pagador.

Los importes del seed se convierten de USD a BOB con un tipo de cambio demo de
**1 USD = 6,96 BOB**. La migración
`20261102000000_bolivia_payment_gateways` convierte datos existentes y
desactiva los métodos genéricos `SIMULATED_*`.

## Inicio rápido con Docker

```bash
cp .env.example .env
docker compose up --build
```

Servicios:

- Frontend: <http://localhost:5173>
- API: <http://localhost:3000/api>
- Swagger: <http://localhost:3000/api/docs>
- Healthcheck: <http://localhost:3000/api/health>

El contenedor del backend aplica `prisma migrate deploy` y ejecuta el seed
idempotente al arrancar (`RUN_SEED=true`).

### Credenciales demo

| Rol | Email | Contraseña |
| --- | --- | --- |
| ADMIN | `admin@sakila-gateway.demo` | `Admin@12345!` |
| STAFF | `staff@sakila-gateway.demo` | `Staff@12345!` |
| VIEWER | `viewer@sakila-gateway.demo` | `Viewer@12345!` |

## Desarrollo local

Requisitos: Node.js 20+, PostgreSQL 17 (o Docker para la base de datos).

```bash
# 1. Base de datos
docker compose up -d db

# 2. Backend
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev

# 3. Frontend (otra terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

El frontend usa el proxy de Vite (`/api` → `http://localhost:3000`).

### Stack de desarrollo con hot reload en Docker

```bash
docker compose -f docker-compose.dev.yml up --build
```

## Pruebas

```bash
cd backend
npm test          # unitarias (simulador, auth, roles, auditoría)
npm run test:e2e  # e2e (health y protección de rutas)
```

El frontend se valida con TypeScript y build de producción:

```bash
cd frontend
npm run build
```

## Estructura del proyecto

```text
sakila-pasarela-nestjs/
├── backend/
│   ├── src/
│   │   ├── auth/          # login, refresh, JWT strategy, guards
│   │   ├── users/         # usuarios administrativos (ADMIN)
│   │   ├── customers/     # clientes Sakila
│   │   ├── films/         # catálogo y categorías
│   │   ├── orders/        # órdenes y cálculo de precios
│   │   ├── payments/      # pagos + simulador determinista
│   │   ├── refunds/       # reembolsos parciales/totales
│   │   ├── reports/       # dashboard y reportes agregados
│   │   ├── audit/         # auditoría automática de mutaciones
│   │   ├── health/        # estado del servicio y DB
│   │   ├── prisma/        # PrismaService global
│   │   └── common/        # DTOs, guards, decoradores, filtros
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── test/              # e2e
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/           # cliente Axios + refresh automático
│   │   ├── components/    # UI reutilizable
│   │   ├── pages/         # vistas de la aplicación
│   │   ├── services/      # capa HTTP por recurso
│   │   ├── store/         # sesión, auth y toasts
│   │   ├── types/         # tipos TypeScript
│   │   └── utils/         # formateo de fechas/importes
│   ├── nginx.conf
│   └── Dockerfile
├── database/              # documentación del esquema/seed
├── docker-compose.yml
├── docker-compose.dev.yml
└── .env.example
```

## API principal

Todas las rutas (excepto login, refresh y health) requieren
`Authorization: Bearer <access_token>`.

### Auth

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/api/auth/login` | Login, devuelve access + refresh token |
| POST | `/api/auth/refresh` | Renueva el access token |
| GET | `/api/auth/me` | Perfil del usuario autenticado |

### Recursos

| Método | Ruta | Roles |
| --- | --- | --- |
| GET | `/api/customers` | Todos |
| GET | `/api/customers/:id` | Todos |
| POST/PATCH | `/api/customers` | ADMIN, STAFF |
| GET | `/api/films`, `/api/films/categories`, `/api/films/:id` | Todos |
| GET | `/api/orders`, `/api/orders/:id`, `/api/orders/:id/payments` | Todos |
| POST | `/api/orders`, `/api/orders/:id/cancel` | ADMIN, STAFF |
| GET | `/api/payments`, `/api/payments/:id`, `/api/payments/:id/status` | Todos |
| GET | `/api/payments/methods` | Todos |
| POST | `/api/payments` | ADMIN, STAFF |
| POST/GET | `/api/payments/:id/refunds` | ADMIN, STAFF / Todos |
| GET | `/api/reports/dashboard`, `/sales`, `/payments`, `/refunds` | Todos |
| GET | `/api/users` | ADMIN |
| POST/PATCH | `/api/users` | ADMIN |
| GET | `/api/audit-logs` | ADMIN |
| GET | `/api/health` | Público |

### Pago simulado

`POST /api/payments` requiere el header `X-Idempotency-Key` (mínimo 8
caracteres). La misma clave con los mismos parámetros devuelve el resultado
original; con parámetros distintos responde `409`.

Ejemplo de pago con QR Simple:

```json
{
  "order_id": "order-002",
  "amount": 20.81,
  "payment_method_id": "pm-qr-001",
  "test_token": "tok_demo_approved_4242"
}
```

Ejemplo de pago con Tigo Money (el celular es obligatorio):

```json
{
  "order_id": "order-002",
  "amount": 20.81,
  "payment_method_id": "pm-wallet-001",
  "payer_identifier": "+59171234567",
  "test_token": "tok_demo_approved_4242"
}
```

La orden debe pagarse por su importe exacto (`total`), en BOB.

Tokens de prueba:

| Token | Resultado |
| --- | --- |
| `tok_demo_approved_4242` | Aprobado |
| `tok_demo_insufficient_9999` | Fondos insuficientes |
| `tok_demo_invalid_0000` | Datos inválidos |
| `tok_demo_error_5678` | Error del proveedor |

Sin token, el simulador decide de forma **determinista** a partir de la clave de
idempotencia, el método y el importe, aplicando umbrales distintos por riel
(QR Simple, billeteras, transferencia y tarjeta).

## Decisiones técnicas

- **Prisma** es la única herramienta de migraciones.
- **Idempotencia** mediante `payment_transactions.idempotency_key` (`UNIQUE`).
- **Importes** con `DECIMAL(19,4)` en PostgreSQL.
- **Precios** calculados siempre en el backend con la tarifa vigente de la
  película; el cliente no puede fijar precios.
- **Reembolsos** validan el saldo disponible de la transacción y actualizan el
  estado de la orden (`PARTIALLY_REFUNDED` / `REFUNDED`).
- **Auditoría** automática de peticiones `POST/PATCH/PUT/DELETE` con redacción de
  campos sensibles.
- **Rate limiting** global y límite más estricto en login/refresh.
- **CORS** con lista explícita desde `CORS_ORIGIN`.
- **Refresh tokens** firmados con secreto independiente y rotación en cada uso.

## Limitaciones conocidas (demo)

- El simulador no contacta ninguna pasarela real.
- Para integrar QR Simple, Tigo Money, Entel Money, BCP/BNB o VisaNet Bolivia
  se requieren credenciales de comercio y contratos con cada proveedor; esta
  demo solo reproduce sus respuestas y referencias.
- Los refresh tokens son stateless: no existe revocación server-side.
- Las direcciones de clientes usan IDs existentes del seed.
- No hay carga de imágenes ni gestión de inventario/rentas completa.
