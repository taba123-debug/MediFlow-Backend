export const configuration = () => ({
  app: {
    port: Number(process.env.PORT ?? 4000),
    frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    swaggerPath: process.env.SWAGGER_PATH ?? 'docs',
  },
  auth: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'change_me_access',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change_me_refresh',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
});
