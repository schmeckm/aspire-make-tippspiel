function parseOrigins(value) {
  if (!value || value === '*') return '*';
  return value.split(',').map((o) => o.trim()).filter(Boolean);
}

function getCorsOptions() {
  const origins = parseOrigins(process.env.CORS_ORIGIN);
  const isWildcard = origins === '*';

  return {
    origin: isWildcard
      ? true
      : (origin, callback) => {
        if (!origin || origins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Language'],
  };
}

function getSocketCorsOrigin() {
  const origins = parseOrigins(process.env.CORS_ORIGIN);
  if (origins === '*') return '*';
  return origins;
}

module.exports = { getCorsOptions, getSocketCorsOrigin, parseOrigins };
