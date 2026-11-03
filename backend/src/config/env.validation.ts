/**
 * Minimal environment validation executed at application startup.
 * Fails fast with a clear message instead of producing cryptic runtime errors.
 */
export function validateEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(
      `Variables de entorno requeridas no definidas: ${missing.join(', ')}. ` +
        'Revise .env.example y cree un archivo .env.',
    );
  }

  const jwtSecret = String(config.JWT_SECRET);
  if (jwtSecret.length < 16) {
    throw new Error('JWT_SECRET debe tener al menos 16 caracteres');
  }

  if (
    config.NODE_ENV === 'production' &&
    jwtSecret === 'change-me-in-production'
  ) {
    throw new Error('JWT_SECRET de ejemplo no permitido en producción');
  }

  return config;
}
