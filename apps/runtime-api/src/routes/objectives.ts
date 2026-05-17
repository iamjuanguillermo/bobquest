import type { FastifyInstance } from 'fastify';
import type { CompleteObjectiveBody, EvaluationService, EvaluateObjectiveBody } from '../services/EvaluationService';
import { completeObjectiveSchema, evaluateObjectiveSchema } from './schemas';

// POST /api/runs/:run_id/objectives/:objective_id/complete
// POST /api/runs/:run_id/objectives/:objective_id/evaluate
export async function objectiveRoutes(app: FastifyInstance, service: EvaluationService) {
  app.post('/api/runs/:run_id/objectives/:objective_id/complete', { schema: completeObjectiveSchema }, async (request) => {
    const params = request.params as { run_id: string; objective_id: string };
    return service.completeObjective(params.run_id, params.objective_id, (request.body ?? {}) as CompleteObjectiveBody);
  });

  app.post('/api/runs/:run_id/objectives/:objective_id/evaluate', { schema: evaluateObjectiveSchema }, async (request) => {
    const params = request.params as { run_id: string; objective_id: string };
    const body = request.body as EvaluateObjectiveBody;
    return service.evaluateOpenAnswer(params.run_id, params.objective_id, body);
  });
}
