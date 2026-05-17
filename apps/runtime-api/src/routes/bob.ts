import type { FastifyInstance } from 'fastify';
import type { BobShellAdapter } from '@bobquest/bob-shell-runtime';
import type { RuntimeEnv } from '../env';

export async function bobRoutes(app: FastifyInstance, env: RuntimeEnv, bobShell: BobShellAdapter) {
  app.get<{ Querystring: { force_check?: string } }>('/api/bob/status', async (request) => {
    const forceCheck = request.query.force_check === 'true';
    return bobShell.status(forceCheck);
  });
}
