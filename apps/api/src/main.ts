import { createDatabase } from '@palnadu/persistence';
import { parseServerConfig } from '@palnadu/server-config';
import { buildServer } from './server.js';

const config = parseServerConfig(process.env);
const database = createDatabase(config);
const server = await buildServer({ config, database });

const shutdown = async () => {
  try {
    await server.close();
  } catch (error) {
    server.log.error({ err: error }, 'Graceful shutdown failed');
    process.exitCode = 1;
  }
};

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());

try {
  await database.ping();
  server.log.info('Database connection pool pre-warmed');
} catch (error) {
  server.log.warn({ err: error }, 'Database pre-warm ping failed, will connect on demand');
}

await server.listen({ host: config.host, port: config.port });
