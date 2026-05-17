import type { FastifyInstance } from 'fastify';
import type { CapabilityService } from '../services/CapabilityService';

export async function capabilityRoutes(app: FastifyInstance, service: CapabilityService) {
  app.get('/api/capabilities', async () => service.capabilities());
}
