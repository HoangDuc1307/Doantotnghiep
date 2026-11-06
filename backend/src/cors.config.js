const fallbackOrigins = ['http://localhost:4200'];

export function readAllowedOrigins(value = process.env.FRONTEND_ORIGINS ?? process.env.FRONTEND_ORIGIN) {
  const origins = typeof value === 'string'
    ? value.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [];
  return origins.length > 0 ? origins : fallbackOrigins;
}

export function isAllowedOrigin(origin, allowedOrigins) {
  return !origin || allowedOrigins.includes(origin);
}
