const BASE_SESSION = {
  session_id: "sess-mock-001",
  user_id: "user-mock-001",
  started_at: "2025-11-12T10:00:00Z",
  expires_at: "2025-11-12T18:00:00Z",
  override_until: null
};

export const loginResponse = {
  ok: true,
  session: BASE_SESSION,
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  policy_version: 3
};

export const policyPayload = {
  version: 3,
  device_id: "dev-mock-001",
  team_id: "t_012",
  tz: "Asia/Kolkata",
  time_anchor: {
    server_now_utc: "2025-11-12T10:00:00Z",
    max_clock_skew_sec: 180,
    max_policy_age_sec: 86400
  },
  session: {
    allowed_windows: [
      { days: ["Mon", "Tue", "Wed", "Thu", "Fri"], start: "08:00", end: "19:30" },
      { days: ["Sat"], start: "09:00", end: "15:00" }
    ],
    grace_minutes: 10,
    supervisor_override_minutes: 120
  },
  pin: {
    mode: "server_verify",
    min_length: 6,
    retry_limit: 5,
    cooldown_seconds: 300
  },
  gps: {
    active_fix_interval_minutes: 3,
    min_displacement_m: 50
  },
  telemetry: {
    heartbeat_minutes: 10,
    batch_max: 50
  },
  meta: {
    issued_at: "2025-11-12T10:00:00Z",
    expires_at: "2025-11-13T10:00:00Z"
  }
};

export const whoamiResponse = {
  user: {
    id: "user-mock-001",
    code: "u001",
    team_id: "t_012",
    display_name: "Mock User"
  },
  session: {
    session_id: "sess-mock-001",
    device_id: "dev-mock-001",
    expires_at: "2025-11-12T18:00:00Z",
    override_until: null
  },
  policy_version: 3
};

export function createTelemetryResponse(events) {
  const total = Array.isArray(events) ? events.length : 0;
  const accepted = Math.min(total, 50);
  return { accepted, dropped: total - accepted };
}

export function createOverrideResponse() {
  const overrideUntil = new Date(Date.now() + 120 * 60000).toISOString();
  return {
    ok: true,
    override_until: overrideUntil,
    token: "override-mock"
  };
}

export function createPolicyResponse(deviceId = policyPayload.device_id) {
  return {
    mock_jws: true,
    payload: {
      ...policyPayload,
      device_id: deviceId
    }
  };
}
