// SurveyLauncher API Client
// Base configuration for API communication

import { PUBLIC_SURVEY_LAUNCHER_API_URL } from '$env/static/public';

// API base URL
export const API_BASE_URL = PUBLIC_SURVEY_LAUNCHER_API_URL || 'http://localhost:3000';

// API endpoints
export const API_ENDPOINTS = {
	// Authentication endpoints
	AUTH: {
		LOGIN: '/api/v1/auth/login',
		LOGOUT: '/api/v1/auth/logout',
		REFRESH: '/api/v1/auth/refresh',
		WHOAMI: '/api/v1/auth/whoami',
		END_SESSION: '/api/v1/auth/session/end'
	},

	// Supervisor endpoints
	SUPERVISOR: {
		OVERRIDE_LOGIN: '/api/v1/supervisor/override/login'
	},

	// Policy endpoints
	POLICY: (deviceId: string) => `/api/v1/policy/${deviceId}`,

	// Telemetry endpoints
	TELEMETRY: {
		SUBMIT: '/api/v1/telemetry'
	}
} as const;

// Request headers configuration
export const getDefaultHeaders = () => ({
	'Content-Type': 'application/json',
	'Accept': 'application/json'
});

// Authenticated headers
export const getAuthHeaders = (accessToken: string) => ({
	...getDefaultHeaders(),
	'Authorization': `Bearer ${accessToken}`
});

// API error handling utilities
export class ApiError extends Error {
	public code: string;
	public requestId: string;
	public status?: number;

	constructor(message: string, code: string, requestId: string, status?: number) {
		super(message);
		this.name = 'ApiError';
		this.code = code;
		this.requestId = requestId;
		this.status = status;
	}
}

// Utility to check if response is an error
export function isApiError(response: any): response is { ok: false; error: { code: string; message: string; request_id: string } } {
	return response && typeof response === 'object' && response.ok === false && response.error;
}

// Handle API responses
export function handleApiResponse(response: Response, data: any) {
	if (!response.ok) {
		const error = isApiError(data)
			? new ApiError(data.error.message, data.error.code, data.error.request_id, response.status)
			: new ApiError(`HTTP ${response.status}: ${response.statusText}`, 'HTTP_ERROR', 'unknown', response.status);
		throw error;
	}

	if (isApiError(data)) {
		throw new ApiError(data.error.message, data.error.code, data.error.request_id, response.status);
	}

	return data;
}

// Retry configuration
export const RETRY_CONFIG = {
	maxRetries: 3,
	baseDelay: 1000, // 1 second
	maxDelay: 10000, // 10 seconds
	retryableErrors: [
		'NETWORK_ERROR',
		'TIMEOUT',
		'SERVER_ERROR'
	]
};

// Exponential backoff retry utility
export async function retryRequest<T>(
	requestFn: () => Promise<T>,
	maxRetries: number = RETRY_CONFIG.maxRetries
): Promise<T> {
	let lastError: Error;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await requestFn();
		} catch (error) {
			lastError = error as Error;

			// Don't retry on non-retryable errors
			if (error instanceof ApiError && !RETRY_CONFIG.retryableErrors.includes(error.code)) {
				throw error;
			}

			// Don't retry on the last attempt
			if (attempt === maxRetries) {
				throw error;
			}

			// Calculate delay with exponential backoff
			const delay = Math.min(
				RETRY_CONFIG.baseDelay * Math.pow(2, attempt),
				RETRY_CONFIG.maxDelay
			);

			// Wait before retrying
			await new Promise(resolve => setTimeout(resolve, delay));
		}
	}

	throw lastError!;
}