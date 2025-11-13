// SurveyLauncher Supervisor Remote Functions
// Type-safe remote functions for supervisor override functionality

import { form } from '$app/server';
import { API_BASE_URL, API_ENDPOINTS, getAuthHeaders, handleApiResponse } from '../client';
import * as v from 'valibot';
import type {
	SupervisorOverrideRequest,
	SupervisorOverrideResponse
} from './types';

// Validation schema
const SupervisorOverrideSchema = v.object({
	supervisor_pin: v.pipe(v.string(), v.minLength(6, 'Supervisor PIN must be at least 6 characters')),
	deviceId: v.pipe(v.string(), v.nonEmpty('Device ID is required'))
});

/**
 * Request supervisor override access for a device
 * POST /api/v1/supervisor/override/login
 */
export const requestOverride = form(
	SupervisorOverrideSchema,
	async ({ supervisor_pin, deviceId }) => {
		try {
			const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SUPERVISOR.OVERRIDE_LOGIN}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				},
				body: JSON.stringify({
					supervisor_pin,
					deviceId
				} as SupervisorOverrideRequest)
			});

			const data = await response.json();
			return handleApiResponse(response, data) as SupervisorOverrideResponse;
		} catch (error) {
			console.error('Supervisor override error:', error);
			throw error;
		}
	}
);

// Supervisor utilities
export const supervisorUtils = {
	/**
	 * Set supervisor override token in cookies
	 */
	setOverrideToken(token: string, overrideUntil: string) {
		// This would typically be handled by the component calling this function
		// The token could be stored in memory or a secure cookie
		return {
			token,
			overrideUntil,
			expiresAt: new Date(overrideUntil)
		};
	},

	/**
	 * Check if override token is still valid
	 */
	isOverrideValid(overrideUntil: string): boolean {
		return new Date() < new Date(overrideUntil);
	},

	/**
	 * Get time remaining for override
	 */
	getOverrideTimeRemaining(overrideUntil: string): number {
		const now = new Date();
		const expiry = new Date(overrideUntil);
		return Math.max(0, expiry.getTime() - now.getTime());
	}
};