import { describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

const capture = vi.hoisted(() => ({
  resource: undefined as string | undefined,
  action: undefined as string | undefined,
}));

vi.mock('../../../src/services/auth-service', () => ({
  AuthService: {
    supervisorOverride: vi.fn().mockResolvedValue({
      success: true,
      overrideUntil: new Date().toISOString(),
      token: 'ovr-token',
    }),
  },
}));

vi.mock('../../../src/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../src/middleware/auth', async () => {
  const actual = await vi.importActual<typeof import('../../../src/middleware/auth')>(
    '../../../src/middleware/auth'
  );

  return {
    ...actual,
    authenticateToken: (_req: Request, _res: Response, next: NextFunction) => next(),
    requirePermission: (resource: string, action: string) => {
      capture.resource = resource;
      capture.action = action;
      return (_req: Request, _res: Response, next: NextFunction) => next();
    },
  };
});

import supervisorRouter from '../../../src/routes/api/supervisor';
import { Resource, Action } from '../../../src/middleware/auth';

describe('Supervisor Route Permissions', () => {
  it('uses supervisor pins execute permission', () => {
    expect(supervisorRouter).toBeDefined();
    expect(capture.resource).toBe(Resource.SUPERVISOR_PINS);
    expect(capture.action).toBe(Action.EXECUTE);
  });
});
