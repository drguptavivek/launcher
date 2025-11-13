import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

// Mock data
const mockSession = {
  session_id: "sess-mock-001",
  user_id: "user-mock-001",
  started_at: "2025-11-12T10:00:00Z",
  expires_at: "2025-11-12T18:00:00Z",
  override_until: null,
};

const mockUser = {
  id: "user-mock-001",
  code: "u001",
  team_id: "t_012",
  display_name: "Mock User",
};

const mockDevice = {
  device_id: "dev-mock-001",
  team_id: "t_012",
};

const mockPolicy = {
  mock_jws: true,
  payload: {
    version: 3,
    device_id: "dev-mock-001",
    team_id: "t_012",
    tz: "Asia/Kolkata",
    time_anchor: {
      server_now_utc: "2025-11-12T10:00:00Z",
      max_clock_skew_sec: 180,
      max_policy_age_sec: 86400,
    },
    session: {
      allowed_windows: [
        { days: ["Mon", "Tue", "Wed", "Thu", "Fri"], start: "08:00", end: "19:30" },
        { days: ["Sat"], start: "09:00", end: "15:00" },
      ],
      grace_minutes: 10,
      supervisor_override_minutes: 120,
    },
    pin: { mode: "server_verify", min_length: 6, retry_limit: 5, cooldown_seconds: 300 },
    gps: { active_fix_interval_minutes: 3, min_displacement_m: 50 },
    telemetry: { heartbeat_minutes: 10, batch_max: 50 },
    meta: {
      issued_at: "2025-11-12T10:00:00Z",
      expires_at: "2025-11-13T10:00:00Z",
    },
  },
};

// Mock login endpoint
function mockLogin(req: Request, res: Response) {
  logger.info('Mock login request', {
    deviceId: req.body.device_id,
    requestCode: req.body.user_code,
    requestId: req.headers['x-request-id'],
  });

  res.json({
    ok: true,
    session: mockSession,
    access_token: "mock-access-token",
    refresh_token: "mock-refresh-token",
    policy_version: 3,
  });
}

// Mock whoami endpoint
function mockWhoami(req: Request, res: Response) {
  logger.info('Mock whoami request', {
    requestId: req.headers['x-request-id'],
  });

  res.json({
    user: mockUser,
    session: {
      ...mockSession,
      device_id: mockDevice.device_id,
    },
    policy_version: 3,
  });
}

// Mock policy endpoint
function mockPolicyHandler(req: Request, res: Response) {
  const { deviceId } = req.params;

  logger.info('Mock policy request', {
    deviceId,
    requestId: req.headers['x-request-id'],
  });

  res.json(mockPolicy);
}

// Mock telemetry endpoint
function mockTelemetry(req: Request, res: Response) {
  const events = req.body.events || [];

  const accepted = Math.min(events.length, 50);
  const dropped = Math.max(0, events.length - 50);

  logger.info('Mock telemetry request', {
    eventsReceived: events.length,
    accepted,
    dropped,
    requestId: req.headers['x-request-id'],
  });

  res.json({
    accepted,
    dropped,
  });
}

// Mock supervisor override login
function mockSupervisorOverrideLogin(req: Request, res: Response) {
  const now = new Date();
  const overrideUntil = new Date(now.getTime() + 120 * 60 * 1000); // +120 minutes

  logger.info('Mock supervisor override request', {
    supervisorPin: req.body.supervisor_pin,
    overrideUntil: overrideUntil.toISOString(),
    requestId: req.headers['x-request-id'],
  });

  res.json({
    ok: true,
    override_until: overrideUntil.toISOString(),
    token: "override-mock",
  });
}

// Mock endpoint router
export function mockRouter(req: Request, res: Response, next: NextFunction) {
  const { method, originalUrl } = req;

  // Route matching
  if (method === 'POST' && originalUrl === '/api/v1/auth/login') {
    return mockLogin(req, res);
  }

  if (method === 'GET' && originalUrl === '/api/v1/auth/whoami') {
    return mockWhoami(req, res);
  }

  if (method === 'GET' && originalUrl.match(/^\/api\/v1\/policy\/[^\/]+$/)) {
    return mockPolicyHandler(req, res);
  }

  if (method === 'POST' && originalUrl === '/api/v1/telemetry') {
    return mockTelemetry(req, res);
  }

  if (method === 'POST' && originalUrl === '/api/v1/supervisor/override/login') {
    return mockSupervisorOverrideLogin(req, res);
  }

  // If no mock route matches, pass to next handler
  next();
}