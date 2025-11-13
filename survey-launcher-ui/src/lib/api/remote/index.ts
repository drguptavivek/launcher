// SurveyLauncher API Remote Functions Export
// Main entry point for all remote functions

// Authentication remote functions
export {
	loginUser,
	getCurrentUser,
	logoutUser,
	refreshToken,
	endSession
} from './auth.remote';

// Supervisor remote functions
export {
	requestOverride
} from './supervisor.remote';

// Policy remote functions
export {
	getDevicePolicy
} from './policy.remote';

// Telemetry remote functions
export {
	submitTelemetry,
	getDeviceTelemetry,
	getDeviceTelemetryStats
} from './telemetry.remote';


// Users utilities and types
export {
	type User,
	type CreateUserRequest,
	type UpdateUserRequest,
	type UsersFilterOptions,
	type UsersResponse,
	createUserSchema,
	updateUserSchema,
	validateUserCode,
	validateUserEmail,
	validateUserPin,
	USER_ROLES,
	USER_ROLE_LABELS,
	hasPermission,
	canManageUsers,
	canOverrideSupervisor
} from './users.utils';

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

