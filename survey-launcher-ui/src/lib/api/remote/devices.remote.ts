// SurveyLauncher Devices API Remote Functions
// Device management endpoints for the SurveyLauncher Admin interface

import { form, query, command } from '$app/server';
import { getRequestEvent } from '$app/server';
import {
	API_BASE_URL,
	getAuthHeaders,
	handleApiResponse
} from '../client';

// Types for devices
export interface Device {
	id: string;
	team_id: string;
	name: string;
	android_id: string;
	app_version: string;
	is_active: boolean;
	last_seen_at: string;
	last_gps_at: string;
	created_at: string;
	updated_at: string;
}

export interface CreateDeviceRequest {
	teamId: string;
	name: string;
	androidId?: string;
	appVersion?: string;
}

export interface UpdateDeviceRequest {
	name?: string;
	androidId?: string;
	appVersion?: string;
	isActive?: boolean;
}

export interface DevicesFilterOptions {
	search?: string;
	teamId?: string;
	isActive?: boolean;
	page?: number;
	limit?: number;
}

export interface DevicesResponse {
	devices: Device[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		pages: number;
	};
}

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

/**
 * List devices with pagination and filtering
 * GET /api/v1/devices
 */
export const getDevices = query(async () => {
	try {
		const accessToken = getAccessToken();

		// Build query string
		const params = new URLSearchParams();
		const queryString = params.toString();
		const url = `${API_BASE_URL}/api/v1/devices${queryString ? '?' + queryString : ''}`;

		const response = await fetch(url, {
			method: 'GET',
			headers: getAuthHeaders(accessToken)
		});

		const data = await response.json();
		return handleApiResponse(response, data) as DevicesResponse;
	} catch (error: any) {
		console.error('Get devices error:', error);
		throw error;
	}
});

/**
 * Get device by ID
 * GET /api/v1/devices/:id
 */
export const getDeviceById = query(async () => {
	try {
		const accessToken = getAccessToken();
		const url = `${API_BASE_URL}/api/v1/devices`;

		const response = await fetch(url, {
			method: 'GET',
			headers: getAuthHeaders(accessToken)
		});

		const data = await response.json();
		return handleApiResponse(response, data);
	} catch (error: any) {
		console.error('Get device error:', error);
		throw error;
	}
});

/**
 * Create new device
 * POST /api/v1/devices
 */
export const createDevice = form(async (formData) => {
	try {
		const accessToken = getAccessToken();
		const url = `${API_BASE_URL}/api/v1/devices`;

		const response = await fetch(url, {
			method: 'POST',
			headers: getAuthHeaders(accessToken),
			body: JSON.stringify(formData)
		});

		const data = await response.json();
		return handleApiResponse(response, data);
	} catch (error: any) {
		console.error('Create device error:', error);
		throw error;
	}
});

/**
 * Update device
 * PUT /api/v1/devices/:id
 */
export const updateDevice = command(async () => {
	try {
		const accessToken = getAccessToken();
		const url = `${API_BASE_URL}/api/v1/devices`;

		const response = await fetch(url, {
			method: 'PUT',
			headers: getAuthHeaders(accessToken),
			body: JSON.stringify({})
		});

		const data = await response.json();
		return handleApiResponse(response, data);
	} catch (error: any) {
		console.error('Update device error:', error);
		throw error;
	}
});

/**
 * Delete device (soft delete)
 * DELETE /api/v1/devices/:id
 */
export const deleteDevice = command(async () => {
	try {
		const accessToken = getAccessToken();
		const url = `${API_BASE_URL}/api/v1/devices`;

		const response = await fetch(url, {
			method: 'DELETE',
			headers: getAuthHeaders(accessToken)
		});

		const data = await response.json();
		return handleApiResponse(response, data);
	} catch (error: any) {
		console.error('Delete device error:', error);
		throw error;
	}
});

/**
 * Get active devices count
 */
export const getActiveDevicesCount = query(async () => {
	const response = await getDevices();
	return response.pagination?.total || 0;
});

/**
 * Get total devices count
 */
export const getTotalDevicesCount = query(async () => {
	const response = await getDevices();
	return response.pagination?.total || 0;
});