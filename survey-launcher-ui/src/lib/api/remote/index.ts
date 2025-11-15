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

// Project Management remote functions
export {
	getProjects,
	createProject,
		} from './projects.remote';

// User Management remote functions
export {
	getUsers,
	getUserById,
	createUser,
	updateUser,
	deleteUser,
	updateUserStatus,
	getTotalUsersCount,
	getActiveUsersCount,
	type User,
	type CreateUserRequest,
	type UpdateUserRequest,
	type UsersFilterOptions,
	type UsersResponse
} from './users.remote';

// Device Management remote functions
export {
	getDevices,
	getDeviceById,
	createDevice,
	updateDevice,
	deleteDevice,
	getActiveDevicesCount,
	getTotalDevicesCount,
	type Device,
	type CreateDeviceRequest,
	type UpdateDeviceRequest,
	type DevicesFilterOptions,
	type DevicesResponse
} from './devices.remote';

// Web Admin Authentication remote functions
export {
	webAdminLogin,
	getWebAdminWhoAmI,
	webAdminLogout,
	refreshWebAdminToken,
	createWebAdminUser,
	type WebAdminLoginRequest,
	type WebAdminLoginResponse,
	type WebAdminUser,
	type WebAdminWhoAmIResponse,
	type CreateWebAdminUserRequest,
	type CreateWebAdminUserResponse
} from './web-admin-auth.remote';

// Note: Utility functions should be imported directly from their respective .utils.ts files
// and should not be exported from this index.ts as SvelteKit remote functions
// can only be exported from .remote.ts files

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

// Project Management types
export type {
	Project,
	CreateProjectRequest,
	UpdateProjectRequest,
	UserAssignment,
	TeamAssignment,
	AssignUserToProjectRequest,
	AssignTeamToProjectRequest,
	ProjectsResponse,
	ProjectResponse,
	UserAssignmentsResponse,
	TeamAssignmentsResponse,
	UserProjectsResponse,
	TeamProjectsResponse,
	Role,
	RolesResponse,
	ProjectsFilterOptions,
	AssignmentFilterOptions,
	ValidationError,
	ProjectStatus,
	GeographicScope,
	AssignmentScope
} from './projects.types';

