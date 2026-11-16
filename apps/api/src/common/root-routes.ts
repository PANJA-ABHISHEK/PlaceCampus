import type { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import type { Request, Response } from 'express';

const DB_STATES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

/**
 * Unprefixed `GET /` and `GET /health` for hosting platforms (e.g. Render).
 * Registered directly on the Express adapter so they sit outside the
 * `api/v1` global prefix and never collide with Nest routes — the existing
 * `GET /api/v1/health` controller is left untouched.
 */
export function registerRootRoutes(app: INestApplication): void {
  const http = app.getHttpAdapter();
  const connection = app.get<Connection>(getConnectionToken(), {
    strict: false,
  });

  http.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'PlaceCampus API',
      message: 'PlaceCampus backend is running',
      api: '/api/v1',
      docs: '/api/docs',
      health: '/health',
    });
  });

  http.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'PlaceCampus API',
      uptime: Math.round(process.uptime()),
      database: DB_STATES[connection.readyState] ?? 'unknown',
      timestamp: new Date().toISOString(),
    });
  });
}
