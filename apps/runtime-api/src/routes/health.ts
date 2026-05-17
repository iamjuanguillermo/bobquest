import type { FastifyInstance } from 'fastify';
import { healthSchema } from './schemas';

// GET /api/healthz
export async function healthRoutes(app: FastifyInstance) {
  app.get('/api/healthz', { schema: healthSchema }, async () => ({ ok: true, service: 'bobquest-runtime-api' }));
}
