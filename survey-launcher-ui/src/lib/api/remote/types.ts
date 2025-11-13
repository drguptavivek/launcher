// SurveyLauncher API Types
// TypeScript definitions for all API requests and responses

export interface LoginRequest {
	deviceId: string;
	userCode: string;
	pin: string;
}

export interface LoginResponse {
	ok: true;
	session: {
		session_id: string;
		user_id: string;
		started_at: string;
		expires_at: string;
		override_until: string | null;
	};
	access_token: string;
	refresh_token: string;
	policy_version: number;
}

export interface RefreshTokenRequest {
	refresh_token: string;
}

export interface RefreshTokenResponse {
	ok: true;
	access_token: string;
	expires_at: string;
}

export interface WhoamiResponse {
	ok: true;
	user: {
		id: string;
		code: string;
		team_id: string;
		display_name: string;
	};
	session: {
		session_id: string;
		device_id: string;
		expires_at: string;
		override_until: string | null;
	};
	policy_version: number;
}

export interface LogoutResponse {
	ok: true;
	message: string;
}

export interface SupervisorOverrideRequest {
	supervisor_pin: string;
	deviceId: string;
}

export interface SupervisorOverrideResponse {
	ok: true;
	override_until: string;
	token: string;
}

export interface PolicyResponse {
	ok: true;
	jws: string;
	payload: {
		version: number;
		device_id: string;
		team_id: string;
		tz: string;
		time_anchor: {
			server_now_utc: string;
			max_clock_skew_sec: number;
			max_policy_age_sec: number;
		};
		session: {
			allowed_windows: Array<{
				days: string[];
				start: string;
				end: string;
			}>;
			grace_minutes: number;
			supervisor_override_minutes: number;
		};
		pin: {
			mode: string;
			min_length: number;
			retry_limit: number;
			cooldown_seconds: number;
		};
		gps: {
			active_fix_interval_minutes: number;
			min_displacement_m: number;
		};
		telemetry: {
			heartbeat_minutes: number;
			batch_max: number;
		};
		meta: {
			issued_at: string;
			expires_at: string;
		};
	};
}

export interface TelemetryEvent {
	type: 'heartbeat' | 'gps' | 'app_usage' | 'screen_time' | 'battery' | 'network' | 'error';
	timestamp: string;
	data: Record<string, any>;
}

export interface TelemetryBatchRequest {
	events: TelemetryEvent[];
}

export interface TelemetryBatchResponse {
	ok: true;
	accepted: number;
	dropped: number;
}

// Error response types
export interface ApiError {
	ok: false;
	error: {
		code: string;
		message: string;
		request_id: string;
	};
}

// Generic API response wrapper
export type ApiResponse<T> = T | ApiError;

// API error codes
export const API_ERROR_CODES = {
	UNAUTHORIZED: 'UNAUTHORIZED',
	LOGIN_FAILED: 'LOGIN_FAILED',
	REFRESH_FAILED: 'REFRESH_FAILED',
	RATE_LIMITED: 'RATE_LIMITED',
	DEVICE_NOT_FOUND: 'DEVICE_NOT_FOUND',
	SESSION_END_FAILED: 'SESSION_END_FAILED',
	POLICY_ERROR: 'POLICY_ERROR',
	INVALID_BATCH: 'INVALID_BATCH',
	TELEMETRY_ERROR: 'TELEMETRY_ERROR',
	MISSING_FIELDS: 'MISSING_FIELDS',
	INTERNAL_ERROR: 'INTERNAL_ERROR',
	AUTH_ERROR: 'AUTH_ERROR'
} as const;

export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES];