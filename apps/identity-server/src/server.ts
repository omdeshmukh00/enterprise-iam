import app from './app.js';
import { env } from './config/env.js';
import { checkDatabaseConnection, prisma } from './config/database.js';

const server = app.listen(env.PORT, async () => {
  console.log(`===========================================`);
  console.log(`🚀 Service:     identity-server`);
  console.log(`🌍 Environment: ${env.NODE_ENV}`);
  console.log(`🔌 Port:        ${env.PORT}`);
  console.log(`🔗 Base URL:    ${env.APP_BASE_URL}`);
  
  const isDbConnected = await checkDatabaseConnection();
  console.log(`🗄️ Database:    ${isDbConnected ? 'Connected (PostgreSQL)' : 'Disconnected (Pending connection)'}`);
  console.log(`===========================================`);
});

const gracefulShutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Shutting down identity-server gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    await prisma.$disconnect();
    console.log('Prisma database client disconnected.');
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
