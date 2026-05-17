import type { FastifyInstance } from 'fastify';
import type { LocalizationService } from '../services/LocalizationService';
import { localizeSchema, preferencesSchema } from './schemas';

export async function localizationRoutes(app: FastifyInstance, service: LocalizationService) {
  app.patch('/api/runs/:run_id/preferences', { schema: preferencesSchema }, async (request) => {
    const params = request.params as { run_id: string };
    const body = request.body as { active_language: string };
    return service.localize(params.run_id, body.active_language);
  });

  app.post('/api/runs/:run_id/localize', { schema: localizeSchema }, async (request) => {
    const params = request.params as { run_id: string };
    const body = request.body as { language: string };
    return service.localize(params.run_id, body.language);
  });
}
