// Authentication Utilities
// Helper functions for authentication token management

import { getRequestEvent } from '$app/server';

export const authUtils = {
	/**
	 * Set authentication tokens in cookies
	 */
	setAuthTokens(accessToken: string, refreshToken: string) {
		const event = getRequestEvent();
		event.cookies.set('access_token', accessToken, {
			path: '/',
			httpOnly: true,
			secure: true, // Set to false for development
			sameSite: 'lax',
			maxAge: 60 * 60 // 1 hour
		});

		event.cookies.set('refresh_token', refreshToken, {
			path: '/',
			httpOnly: true,
			secure: true, // Set to false for development
			sameSite: 'lax',
			maxAge: 7 * 24 * 60 * 60 // 7 days
		});
	},

	/**
	 * Clear authentication tokens
	 */
	clearAuthTokens() {
		const event = getRequestEvent();
		event.cookies.delete('access_token', { path: '/' });
		event.cookies.delete('refresh_token', { path: '/' });
	},

	/**
	 * Get current access token from cookies
	 */
	getAccessToken(): string | null {
		try {
			const event = getRequestEvent();
			return event.cookies.get('access_token') || null;
		} catch {
			return null;
		}
	},

	/**
	 * Get refresh token from cookies
	 */
	getRefreshToken(): string | null {
		try {
			const event = getRequestEvent();
			return event.cookies.get('refresh_token') || null;
		} catch {
			return null;
		}
	},

	/**
	 * Check if user is authenticated
	 */
	isAuthenticated(): boolean {
		return !!this.getAccessToken();
	}
};