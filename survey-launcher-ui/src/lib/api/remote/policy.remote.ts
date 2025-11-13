// SurveyLauncher Policy Remote Functions
// Type-safe remote functions for policy management

import { query } from '$app/server';
import { API_BASE_URL, API_ENDPOINTS, getAuthHeaders, handleApiResponse } from '../client';
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

// Policy utilities
export const policyUtils = {
	/**
	 * Parse and validate policy JWS token
	 */
	async parsePolicyJWS(jws: string) {
		// For now, return the JWS as-is
		// In a real implementation, you would verify the JWS signature
		// using the policy public key from the backend
		return {
			jws,
			valid: true,
			parsed: null // TODO: Implement JWS parsing
		};
	},

	/**
	 * Check if policy is expired
	 */
	isPolicyExpired(expiresAt: string): boolean {
		return new Date() >= new Date(expiresAt);
	},

	/**
	 * Get time until policy expires
	 */
	getPolicyTimeRemaining(expiresAt: string): number {
		const now = new Date();
		const expiry = new Date(expiresAt);
		return Math.max(0, expiry.getTime() - now.getTime());
	},

	/**
	 * Check if current time is within allowed session windows
	 */
	isWithinSessionWindows(
		sessionWindows: Array<{ days: string[]; start: string; end: string }>,
		currentDate: Date = new Date()
	): boolean {
		const currentDay = currentDate.toLocaleDateString('en-US', { weekday: 'short' });
		const currentTime = currentDate.toTimeString().slice(0, 5); // HH:MM format

		return sessionWindows.some(window => {
			const isDayMatch = window.days.includes(currentDay);
			const isTimeMatch = currentTime >= window.start && currentTime <= window.end;
			return isDayMatch && isTimeMatch;
		});
	},

	/**
	 * Format session windows for display
	 */
	formatSessionWindows(windows: Array<{ days: string[]; start: string; end: string }>) {
		return windows.map(window => ({
			days: window.days.join(', '),
			timeRange: `${window.start} - ${window.end}`,
			isWeekend: window.days.every(day => ['Sat', 'Sun'].includes(day))
		}));
	}
};