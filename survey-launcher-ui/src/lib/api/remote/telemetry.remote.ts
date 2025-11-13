// SurveyLauncher Telemetry Remote Functions
// Type-safe remote functions for telemetry submission and retrieval

import { form, query } from '$app/server';
import { API_BASE_URL, API_ENDPOINTS, getAuthHeaders, handleApiResponse } from '../client';
import * as v from 'valibot';
import type {
	TelemetryEvent,
	TelemetryBatchRequest,
	TelemetryBatchResponse
} from './types';

// Validation schemas - simplified for form validation
const TelemetryBatchSchema = v.object({
	events: v.pipe(
		v.array(v.string(), 'Events array is required'),
		v.minLength(1, 'At least one event is required'),
		v.maxLength(50, 'Maximum batch size is 50 events')
	)
});

const DeviceTelemetrySchema = v.object({
	deviceId: v.pipe(v.string(), v.nonEmpty('Device ID is required')),
	eventType: v.optional(v.string()),
	dateFrom: v.optional(v.string()),
	dateTo: v.optional(v.string()),
	limit: v.optional(v.number())
});

/**
 * Submit a batch of telemetry events from a device
 * POST /api/v1/telemetry
 */
export const submitTelemetry = form(
	TelemetryBatchSchema,
	async ({ events }) => {
		try {
			// Parse JSON string events (coming from form data)
			const parsedEvents: TelemetryEvent[] = events.map(eventStr =>
				JSON.parse(eventStr)
			);

			const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.TELEMETRY.SUBMIT}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				},
				body: JSON.stringify({ events: parsedEvents } as TelemetryBatchRequest)
			});

			const data = await response.json();
			return handleApiResponse(response, data) as TelemetryBatchResponse;
		} catch (error) {
			console.error('Submit telemetry error:', error);
			throw error;
		}
	}
);

/**
 * Get device telemetry history (custom query for admin interface)
 * This is a custom endpoint for the admin interface
 */
export const getDeviceTelemetry = query(
	DeviceTelemetrySchema,
	async ({ deviceId, eventType, dateFrom, dateTo, limit }) => {
		try {
			const params = new URLSearchParams();
			if (eventType) params.append('type', eventType);
			if (dateFrom) params.append('date_from', dateFrom);
			if (dateTo) params.append('date_to', dateTo);
			if (limit) params.append('limit', limit.toString());

			const response = await fetch(`${API_BASE_URL}/api/v1/admin/telemetry/${deviceId}?${params}`, {
				method: 'GET',
				headers: getAuthHeaders('admin_token') // TODO: Get actual admin token
			});

			const data = await response.json();
			return handleApiResponse(response, data);
		} catch (error) {
			console.error('Get device telemetry error:', error);
			throw error;
		}
	}
);

/**
 * Get device telemetry statistics
 */
export const getDeviceTelemetryStats = query(
	DeviceTelemetrySchema,
	async ({ deviceId, dateFrom, dateTo }) => {
		try {
			const params = new URLSearchParams();
			if (dateFrom) params.append('date_from', dateFrom);
			if (dateTo) params.append('date_to', dateTo);

			const response = await fetch(`${API_BASE_URL}/api/v1/admin/telemetry/${deviceId}/stats?${params}`, {
				method: 'GET',
				headers: getAuthHeaders('admin_token') // TODO: Get actual admin token
			});

			const data = await response.json();
			return handleApiResponse(response, data);
		} catch (error) {
			console.error('Get device telemetry stats error:', error);
			throw error;
		}
	}
);

