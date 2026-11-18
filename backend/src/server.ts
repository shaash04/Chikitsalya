import { createApp } from './app.js';
import { env } from './config/env.js';
import { initializeDatabase } from './config/database.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  try {
    logger.info('=====================================================');
    logger.info('  SECURE HOSPITAL MANAGEMENT SYSTEM (SHMS) BACKEND   ');
    logger.info('=====================================================');
    logger.info(`Environment: ${env.NODE_ENV.toUpperCase()}`);
    logger.info(`Port: ${env.PORT}`);

    // Initialize database connection and schemas
    const dbInstance = await initializeDatabase();
    logger.info(`Active Database Engine: ${dbInstance.getEngineName()}`);

    const app = createApp();

    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 SHMS Backend REST API active on: http://localhost:${env.PORT}`);
      logger.info(`🔒 Security controls active: Helmet, CSP, CSRF, Bcrypt(12), RBAC, IDOR Guards, Audit Logs`);
      logger.info(`🌐 Allowed Client Origin: ${env.CLIENT_URL}`);
    });

    const shutdown = () => {
      logger.info('Received termination signal. Shutting down gracefully...');
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception caught safely:', err);
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Promise Rejection caught safely:', reason);
    });
  } catch (error: any) {
    logger.error('Fatal initialization error in SHMS backend:', error);
    process.exit(1);
  }
}

bootstrap();
