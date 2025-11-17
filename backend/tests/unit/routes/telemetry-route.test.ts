import { describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

const permissionCapture = vi.hoisted(() => ({
  resource: undefined as string | undefined,
  action: undefined as string | undefined,
}));

vi.mock('../../../src/services/telemetry-service', () => ({
  TelemetryService: {
    ingestBatch: vi.fn().mockResolvedValue({
      success: true,
      accepted: 1,
      dropped: 0,
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
    authenticateToken: (req: any, _res: Response, next: NextFunction) => {
      req.user = {
        id: 'user-123',
        code: 'test001',
        teamId: 'team-123',
        displayName: 'User',
        email: null,
        isActive: true,
        role: 'TEAM_MEMBER',
        roles: [],
      };
      req.session = {
        sessionId: 'session-123',
        userId: 'user-123',
        teamId: 'team-123',
        deviceId: 'device-123',
        startedAt: new Date(),
        expiresAt: new Date(Date.now() + 60_000),
        overrideUntil: null,
        status: 'open',
      };
      next();
    },
    requirePermission: (resource: string, action: string) => {
      permissionCapture.resource = resource;
      permissionCapture.action = action;
      return (_req: Request, _res: Response, next: NextFunction) => next();
    },
  };
});

import telemetryRouter from '../../../src/routes/api/telemetry';
import { Resource, Action } from '../../../src/middleware/auth';

describe('Telemetry Route Permissions', () => {
  it('registers create permission middleware', () => {
    expect(telemetryRouter).toBeDefined();
    expect(permissionCapture.resource).toBe(Resource.TELEMETRY);
    expect(permissionCapture.action).toBe(Action.CREATE);
  });
});
