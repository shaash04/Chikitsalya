import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const correlationId = req.correlationId || 'unknown-corr';

  // Input validation errors from Zod
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request input. Please check provided fields.',
        details: formattedErrors,
        correlationId
      }
    });
  }

  // CORS error
  if (err.message && err.message.includes('CORS policy')) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'CORS_FORBIDDEN',
        message: err.message,
        correlationId
      }
    });
  }

  // Internal server error: Log full stack trace internally, return safe generic message to client
  logger.error(`Internal Unhandled Error [${correlationId}]:`, err);

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred. For security reasons, details are suppressed.',
      correlationId
    }
  });
}
