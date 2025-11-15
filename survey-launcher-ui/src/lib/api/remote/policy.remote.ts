// SurveyLauncher Policy Remote Functions
// Type-safe remote functions for policy management

import { query } from '$app/server';
import { API_BASE_URL, API_ENDPOINTS, handleApiResponse } from '../client';
import * as v from 'valibot';
import type { PolicyResponse } from './types';

// Validation schema
const DevicePolicySchema = v.object({
	deviceId: v.pipe(v.string(), v.nonEmpty('Device ID is required'))
});

/**
 * Get policy configuration for a specific device
 * GET /api/v1/policy/:deviceId
 */
export const getDevicePolicy = query(
	DevicePolicySchema,
	async ({ deviceId }) => {
		try {
			const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.POLICY(deviceId)}`, {
				method: 'GET',
				headers: {
					'Accept': 'application/json'
				}
			});

			const data = await response.json();
			return handleApiResponse(response, data) as PolicyResponse;
		} catch (error) {
			console.error('Get device policy error:', error);
			throw error;
		}
	}
);

