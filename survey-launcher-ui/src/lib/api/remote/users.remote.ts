// SurveyLauncher Users API Remote Functions
// User management endpoints for the SurveyLauncher Admin interface

import { form, query, command } from '$app/server';
import { getRequestEvent } from '$app/server';
import {
	API_BASE_URL,
	API_ENDPOINTS,
	getAuthHeaders,
	handleApiResponse
} from '../client';

// Helper function to get access token
function getAccessToken(): string {
	const event = getRequestEvent();
	if (!event) {
		throw new Error('No access token found. Please login first.');
	}

	const accessToken = event.cookies.get('access_token');
	if (!accessToken) {
		throw new Error('No access token found. Please login first.');
	}

	return accessToken;
}

// Types for user management
export interface User {
	id: string;
	team_id: string;
	code: string;
	display_name: string;
	email: string | null;
	role: 'TEAM_MEMBER' | 'FIELD_SUPERVISOR' | 'REGIONAL_MANAGER' | 'SYSTEM_ADMIN' | 'SUPPORT_AGENT' | 'AUDITOR' | 'DEVICE_MANAGER' | 'POLICY_ADMIN' | 'NATIONAL_SUPPORT_ADMIN';
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export interface CreateUserRequest {
	teamId: string;
	code: string;
	displayName: string;
	email?: string;
	role?: User['role'];
	pin: string;
}

export interface UpdateUserRequest {
	displayName?: string;
	email?: string;
	role?: User['role'];
	isActive?: boolean;
	pin?: string;
}

export interface UsersFilterOptions {
	search?: string;
	teamId?: string;
	role?: string;
	isActive?: boolean;
	page?: number;
	limit?: number;
}

export interface UsersResponse {
	users: User[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

/**
 * List users with pagination and filtering
 * GET /api/v1/users
 */
export const getUsers = query(async (options: UsersFilterOptions = {}) => {
	try {
		const accessToken = getAccessToken();

		// Build query string
		const params = new URLSearchParams();
		if (options.search) params.append('search', options.search);
		if (options.teamId) params.append('team_id', options.teamId);
		if (options.role) params.append('role', options.role);
		if (options.isActive !== undefined) params.append('is_active', options.isActive.toString());
		if (options.page) params.append('page', options.page.toString());
		if (options.limit) params.append('limit', Math.min(options.limit, 100).toString());

		const queryString = params.toString();
		const url = `${API_BASE_URL}/api/v1/users${queryString ? '?' + queryString : ''}`;

		const response = await fetch(url, {
			method: 'GET',
			headers: getAuthHeaders(accessToken)
		});

		const data = await response.json();

		if (!data.ok) {
			throw new Error(data.error?.message || 'Failed to fetch users');
		}

		return {
			users: data.users || [],
			total: data.pagination?.total || 0,
			page: data.pagination?.page || options.page || 1,
			limit: data.pagination?.limit || options.limit || 50,
			totalPages: data.pagination?.pages || 0
		};
	} catch (error: any) {
		console.error('Get users error:', error);
		throw error;
	}
});

/**
 * Get user by ID
 * GET /api/v1/users/:id
 */
export const getUserById = query(async () => {
	try {
		const accessToken = getAccessToken();
		const url = `${API_BASE_URL}/api/v1/users`;

		const response = await fetch(url, {
			method: 'GET',
			headers: getAuthHeaders(accessToken)
		});

		const data = await response.json();

		if (!data.ok) {
			if (data.error?.code === 'USER_NOT_FOUND') {
				return null;
			}
			throw new Error(data.error?.message || 'Failed to fetch user');
		}

		return data.user;
	} catch (error: any) {
		console.error('Get user error:', error);
		throw error;
	}
});

/**
 * Create new user
 * POST /api/v1/users
 */
export const createUser = form(async (formData) => {
	try {
		const accessToken = getAccessToken();
		const url = `${API_BASE_URL}/api/v1/users`;

		const response = await fetch(url, {
			method: 'POST',
			headers: getAuthHeaders(accessToken),
			body: JSON.stringify(formData)
		});

		const data = await response.json();

		if (!data.ok) {
			throw new Error(data.error?.message || 'Failed to create user');
		}

		return data.user;
	} catch (error: any) {
		console.error('Create user error:', error);
		throw error;
	}
});

/**
 * Update user
 * PUT /api/v1/users/:id
 */
export const updateUser = command(async () => {
	try {
		const accessToken = getAccessToken();
		const url = `${API_BASE_URL}/api/v1/users`;

		const response = await fetch(url, {
			method: 'PUT',
			headers: getAuthHeaders(accessToken),
			body: JSON.stringify({})
		});

		const data = await response.json();

		if (!data.ok) {
			throw new Error(data.error?.message || 'Failed to update user');
		}

		return data.user;
	} catch (error: any) {
		console.error('Update user error:', error);
		throw error;
	}
});

/**
 * Delete user (soft delete)
 * DELETE /api/v1/users/:id
 */
export const deleteUser = command(async () => {
	try {
		const accessToken = getAccessToken();
		const url = `${API_BASE_URL}/api/v1/users`;

		const response = await fetch(url, {
			method: 'DELETE',
			headers: getAuthHeaders(accessToken)
		});

		const data = await response.json();

		if (!data.ok) {
			throw new Error(data.error?.message || 'Failed to delete user');
		}

		return data;
	} catch (error: any) {
		console.error('Delete user error:', error);
		throw error;
	}
});

/**
 * Update user status
 */
export const updateUserStatus = command(async () => {
	return await updateUser();
});

/**
 * Get total users count
 */
export const getTotalUsersCount = query(async () => {
	const response = await getUsers();
	return response.total || 0;
});

/**
 * Get active users count
 */
export const getActiveUsersCount = query(async () => {
	const response = await getUsers();
	return response.total || 0;
});