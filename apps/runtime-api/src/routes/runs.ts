import type { FastifyInstance } from 'fastify';
import type { RunService } from '../services/RunService';
import { runtimeError } from '../security/errorResponse';
import { cancelRunSchema, createRunSchema, getRunSchema } from './schemas';

// POST /api/runs
// GET /api/runs/:run_id
// POST /api/runs/:run_id/cancel
export async function runRoutes(app: FastifyInstance, service: RunService) {
  app.post('/api/runs', { schema: createRunSchema }, async (request, reply) => {
    const state = await service.createRun((request.body ?? {}) as { repo_url?: string; repo_id?: string });
    return reply.code(202).send(state);
  });

  app.get('/api/runs/:run_id', { schema: getRunSchema }, async (request) => {
    const params = request.params as { run_id: string };
    const state = await service.getRun(params.run_id);
    if (!state) throw runtimeError('RUN_NOT_FOUND', 'Run state not found.', 404);
    return state;
  });

  app.post('/api/runs/:run_id/cancel', { schema: cancelRunSchema }, async (request) => {
    const params = request.params as { run_id: string };
    return service.cancelRun(params.run_id);
  });
}
