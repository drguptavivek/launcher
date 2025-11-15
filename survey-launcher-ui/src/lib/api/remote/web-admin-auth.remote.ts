// SurveyLauncher Web Admin Authentication Remote Functions
// Web Admin authentication endpoints for the SurveyLauncher Admin interface

import { form, query } from '$app/server';
import { getRequestEvent } from '$app/server';
import { API_BASE_URL } from '../client';

// Types for Web Admin authentication
export interface WebAdminLoginRequest {
	email: string;
	password: string;
}

export interface WebAdminLoginResponse {
	ok: boolean;
	user?: {
		id: string;
		email: string;
		firstName: string;
		lastName: string;
		role: string;
		fullName: string;
	};
	accessToken?: string;
	refreshToken?: string;
	error?: {
		code: string;
		message: string;
	};
}

export interface WebAdminUser {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	role: string;
	fullName: string;
	lastLoginAt?: string;
}

export interface WebAdminWhoAmIResponse {
	ok: boolean;
	user?: WebAdminUser;
	error?: {
		code: string;
		message: string;
	};
}

export interface CreateWebAdminUserRequest {
	email: string;
	password: string;
	firstName: string;
	lastName: string;
	role?: string;
}

export interface CreateWebAdminUserResponse {
	ok: boolean;
	user?: {
		id: string;
		email: string;
		firstName: string;
		lastName: string;
		role: string;
		isActive: boolean;
		createdAt: string;
	};
	message?: string;
	error?: {
		code: string;
		message: string;
	};
}

/**
 * Web Admin login with email and password
 * POST /api/web-admin/auth/login
 */
export const webAdminLogin = form(async (credentials) => {
	try {
		const response = await fetch(`${API_BASE_URL}/api/web-admin/auth/login`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(credentials),
			credentials: 'include' // Important for cookies
		});

		const data = await response.json();

		if (!data.ok) {
			throw new Error(data.error?.message || 'Login failed');
		}

		return {
			ok: true,
			user: data.user,
			accessToken: data.accessToken,
			refreshToken: data.refreshToken
		} as WebAdminLoginResponse;
	} catch (error: any) {
		console.error('Web admin login error:', error);
		return {
			ok: false,
			error: {
				code: 'LOGIN_ERROR',
				message: error.message || 'Login failed'
			}
		} as WebAdminLoginResponse;
	}
});

/**
 * Get current Web Admin user information
 * GET /api/web-admin/auth/whoami
 */
export const getWebAdminWhoAmI = query(async () => {
	try {
		const response = await fetch(`${API_BASE_URL}/api/web-admin/auth/whoami`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include' // Important for cookies
		});

		const data = await response.json();

		if (!data.ok) {
			if (data.error?.code === 'NO_TOKEN') {
				return {
					ok: false,
					error: {
						code: 'NOT_AUTHENTICATED',
						message: 'Not authenticated'
					}
				} as WebAdminWhoAmIResponse;
			}
			throw new Error(data.error?.message || 'Failed to get user info');
		}

		return {
			ok: true,
			user: data.user
		} as WebAdminWhoAmIResponse;
	} catch (error: any) {
		console.error('Web admin whoami error:', error);
		return {
			ok: false,
			error: {
				code: 'WHOAMI_ERROR',
				message: error.message || 'Failed to get user information'
			}
		} as WebAdminWhoAmIResponse;
	}
});

/**
 * Web Admin logout
 * POST /api/web-admin/auth/logout
 */
export const webAdminLogout = form(async () => {
	try {
		const response = await fetch(`${API_BASE_URL}/api/web-admin/auth/logout`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include' // Important for cookies
		});

		const data = await response.json();

		if (!data.ok) {
			throw new Error(data.error?.message || 'Logout failed');
		}

		return {
			ok: true,
			message: data.message
		};
	} catch (error: any) {
		console.error('Web admin logout error:', error);
		throw error;
	}
});

/**
 * Refresh access token
 * POST /api/web-admin/auth/refresh
 */
export const refreshWebAdminToken = query(async () => {
	try {
		const response = await fetch(`${API_BASE_URL}/api/web-admin/auth/refresh`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: 'include' // Important for cookies
		});

		const data = await response.json();

		if (!data.ok) {
			throw new Error(data.error?.message || 'Token refresh failed');
		}

		return {
			ok: true,
			accessToken: data.accessToken,
			user: data.user
		};
	} catch (error: any) {
		console.error('Web admin token refresh error:', error);
		throw error;
	}
});

/**
 * Create a new Web Admin user (for initial setup)
 * POST /api/web-admin/auth/create-admin
 */
export const createWebAdminUser = form(async (userData) => {
	try {
		const response = await fetch(`${API_BASE_URL}/api/web-admin/auth/create-admin`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(userData),
			credentials: 'include'
		});

		const data = await response.json();

		if (!data.ok) {
			throw new Error(data.error?.message || 'Failed to create admin user');
		}

		return {
			ok: true,
			user: data.user,
			message: data.message
		} as CreateWebAdminUserResponse;
	} catch (error: any) {
		console.error('Create web admin user error:', error);
		return {
			ok: false,
			error: {
				code: 'CREATION_ERROR',
				message: error.message || 'Failed to create admin user'
			}
		} as CreateWebAdminUserResponse;
	}
});