// SurveyLauncher Authentication Remote Functions
// Type-safe remote functions for authentication endpoints

import { form, query, command } from '$app/server';
import { getRequestEvent } from '$app/server';
import * as v from 'valibot';
import { API_BASE_URL, API_ENDPOINTS, getAuthHeaders, handleApiResponse } from '../client';
import type {
	LoginRequest,
	LoginResponse,
	RefreshTokenRequest,
	RefreshTokenResponse,
	WhoamiResponse,
	LogoutResponse
} from './types';

// Validation schemas
const LoginSchema = v.object({
	deviceId: v.pipe(v.string(), v.nonEmpty('Device ID is required')),
	userCode: v.pipe(v.string(), v.nonEmpty('User code is required')),
	pin: v.pipe(v.string(), v.minLength(6, 'PIN must be at least 6 characters'))
});

const RefreshTokenSchema = v.object({
	refresh_token: v.pipe(v.string(), v.nonEmpty('Refresh token is required'))
});

/**
 * Login user with device credentials
 * POST /api/v1/auth/login
 */
export const loginUser = form(
	LoginSchema,
	async ({ deviceId, userCode, pin }) => {
		try {
			const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				},
				body: JSON.stringify({ deviceId, userCode, pin } as LoginRequest)
			});

			const data = await response.json();
			return handleApiResponse(response, data) as LoginResponse;
		} catch (error) {
			console.error('Login error:', error);
			throw error;
		}
	}
);

/**
 * Get current user and session information
 * GET /api/v1/auth/whoami
 */
export const getCurrentUser = query(async () => {
	try {
		const event = getRequestEvent();
		const accessToken = event.cookies.get('access_token');

		if (!accessToken) {
			throw new Error('No access token found');
		}

		const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.WHOAMI}`, {
			method: 'GET',
			headers: getAuthHeaders(accessToken)
		});

		const data = await response.json();
		return handleApiResponse(response, data) as WhoamiResponse;
	} catch (error) {
		console.error('Get current user error:', error);
		throw error;
	}
});

/**
 * Logout current user
 * POST /api/v1/auth/logout
 */
export const logoutUser = command(async () => {
	try {
		const event = getRequestEvent();
		const accessToken = event.cookies.get('access_token');

		if (!accessToken) {
			throw new Error('No access token found');
		}

		const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGOUT}`, {
			method: 'POST',
			headers: getAuthHeaders(accessToken)
		});

		const data = await response.json();
		return handleApiResponse(response, data) as LogoutResponse;
	} catch (error) {
		console.error('Logout error:', error);
		throw error;
	}
});

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
export const refreshToken = form(
	RefreshTokenSchema,
	async ({ refresh_token }) => {
		try {
			const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.REFRESH}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				},
				body: JSON.stringify({ refresh_token } as RefreshTokenRequest)
			});

			const data = await response.json();
			return handleApiResponse(response, data) as RefreshTokenResponse;
		} catch (error) {
			console.error('Refresh token error:', error);
			throw error;
		}
	}
);

/**
 * End current session
 * POST /api/v1/auth/session/end
 */
export const endSession = command(async () => {
	try {
		const event = getRequestEvent();
		const accessToken = event.cookies.get('access_token');

		if (!accessToken) {
			throw new Error('No access token found');
		}

		const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.END_SESSION}`, {
			method: 'POST',
			headers: getAuthHeaders(accessToken)
		});

		const data = await response.json();
		return handleApiResponse(response, data) as LogoutResponse;
	} catch (error) {
		console.error('End session error:', error);
		throw error;
	}
});

