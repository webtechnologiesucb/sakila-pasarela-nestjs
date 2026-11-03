process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://sakila:sakila@localhost:5432/sakila_gateway?schema=public';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test-jwt-secret-please-change-123456';
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-please-change-654321';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
