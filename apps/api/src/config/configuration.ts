export default () => ({
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',

  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,

  keycloak: {
    issuer: process.env.KEYCLOAK_ISSUER,
  },
});
