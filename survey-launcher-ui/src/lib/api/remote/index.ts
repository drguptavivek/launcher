// SurveyLauncher API Remote Functions Export
// Main entry point for all remote functions

// Authentication remote functions
export {
	loginUser,
	getCurrentUser,
	logoutUser,
	refreshToken,
	endSession,
	authUtils
} from './auth.remote';

// Supervisor remote functions
export {
	requestOverride,
	supervisorUtils
} from './supervisor.remote';

// Policy remote functions
export {
	getDevicePolicy,
	policyUtils
} from './policy.remote';

// Telemetry remote functions
export {
	submitTelemetry,
	getDeviceTelemetry,
	getDeviceTelemetryStats,
	telemetryUtils
} from './telemetry.remote';

// Types
export type {
	LoginRequest,
	LoginResponse,
	RefreshTokenRequest,
	RefreshTokenResponse,
	WhoamiResponse,
	LogoutResponse,
	SupervisorOverrideRequest,
	SupervisorOverrideResponse,
	PolicyResponse,
	TelemetryEvent,
	TelemetryBatchRequest,
	TelemetryBatchResponse,
	ApiError,
	ApiResponse,
	ApiErrorCode
} from './types';