# Base de datos

La fuente de verdad del esquema es **Prisma**:

- Esquema: [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma)
- Migraciones: [`backend/prisma/migrations`](../backend/prisma/migrations)
- Seed demo: [`backend/prisma/seed.ts`](../backend/prisma/seed.ts)

Este directorio se conserva para documentación y para alojar artefactos SQL
auxiliares. No se deben editar tablas a mano: cualquier cambio debe pasar por
una migración de Prisma.

## Migraciones

```bash
cd backend
npx prisma migrate deploy      # aplicar migraciones (CI / Docker)
npx prisma migrate dev         # crear una migración en desarrollo
```

## Seeds

```bash
cd backend
npm run prisma:seed
```

El seed es idempotente (`upsert`) y crea:

- Idiomas, categorías, actores y películas Sakila
- Países, ciudades, direcciones, tiendas y staff
- Clientes, inventario y pagos Sakila
- Métodos de pago bolivianos simulados (QR Simple, Tigo Money, Entel Money,
  transferencia BCP/BNB y tarjeta VisaNet Bolivia)
- Usuarios demo ADMIN / STAFF / VIEWER
- Órdenes, transacciones y reembolsos de ejemplo en BOB

> ⚠️ Entorno de demostración. No se procesa dinero real.
