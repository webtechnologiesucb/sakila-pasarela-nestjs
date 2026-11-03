# Migraciones SQL

Las migraciones reales viven en `backend/prisma/migrations` porque Prisma es la
única herramienta de migraciones del proyecto (decisión de arquitectura).

Esta carpeta queda como punto de referencia para scripts SQL puntuales que no
puedan expresarse en Prisma (por ejemplo, extensiones de PostgreSQL).
