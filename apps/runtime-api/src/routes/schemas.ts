import type { FastifySchema } from 'fastify';

const errorResponse = {
  type: 'object',
  required: ['error'],
  additionalProperties: false,
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message'],
      additionalProperties: false,
      properties: {
        code: { type: 'string' },
        message: { type: 'string' }
      }
    }
  }
};

const runIdParams = {
  type: 'object',
  required: ['run_id'],
  additionalProperties: false,
  properties: {
    run_id: { type: 'string', pattern: '^run_[A-Za-z0-9]+$' }
  }
};

const objectiveParams = {
  type: 'object',
  required: ['run_id', 'objective_id'],
  additionalProperties: false,
  properties: {
    run_id: { type: 'string', pattern: '^run_[A-Za-z0-9]+$' },
    objective_id: { type: 'string', minLength: 1, maxLength: 160 }
  }
};

export const healthSchema: FastifySchema = {
  response: {
    200: {
      type: 'object',
      required: ['ok', 'service'],
      additionalProperties: false,
      properties: {
        ok: { type: 'boolean' },
        service: { type: 'string' }
      }
    }
  }
};

export const createRunSchema: FastifySchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    properties: {
      repo_url: { type: 'string', minLength: 1, maxLength: 500 },
      repo_id: { type: 'string', minLength: 1, maxLength: 240 }
    },
    anyOf: [{ required: ['repo_url'] }, { required: ['repo_id'] }]
  },
  response: { 400: errorResponse, 403: errorResponse, 429: errorResponse, 500: errorResponse }
};

export const getRunSchema: FastifySchema = {
  params: runIdParams,
  response: { 404: errorResponse, 500: errorResponse }
};

export const cancelRunSchema: FastifySchema = {
  params: runIdParams,
  body: {
    type: 'object',
    additionalProperties: false,
    properties: {}
  },
  response: { 404: errorResponse, 500: errorResponse }
};

export const completeObjectiveSchema: FastifySchema = {
  params: objectiveParams,
  body: {
    type: 'object',
    required: ['answer'],
    additionalProperties: false,
    properties: {
      answer: {
        type: 'object',
        required: ['type'],
        additionalProperties: true,
        properties: {
          type: {
            type: 'string',
            enum: ['single_choice', 'multi_choice', 'short_text', 'confirm_understanding', 'file_focus']
          }
        }
      }
    }
  },
  response: { 400: errorResponse, 404: errorResponse, 500: errorResponse }
};

export const evaluateObjectiveSchema: FastifySchema = {
  params: objectiveParams,
  body: {
    type: 'object',
    required: ['interaction_id', 'answer'],
    additionalProperties: false,
    properties: {
      interaction_id: { type: 'string', minLength: 1, maxLength: 200 },
      answer: { type: 'string', minLength: 1, maxLength: 10000 }
    }
  },
  response: { 400: errorResponse, 404: errorResponse, 429: errorResponse, 500: errorResponse }
};

export const preferencesSchema: FastifySchema = {
  params: runIdParams,
  body: {
    type: 'object',
    required: ['active_language'],
    additionalProperties: false,
    properties: {
      active_language: { type: 'string', minLength: 2, maxLength: 16 }
    }
  },
  response: { 400: errorResponse, 404: errorResponse, 429: errorResponse, 503: errorResponse }
};

export const localizeSchema: FastifySchema = {
  params: runIdParams,
  body: {
    type: 'object',
    required: ['language'],
    additionalProperties: false,
    properties: {
      language: { type: 'string', minLength: 2, maxLength: 16 }
    }
  },
  response: { 400: errorResponse, 404: errorResponse, 429: errorResponse, 503: errorResponse }
};
