// Authentication Store
// Reactive authentication state management using Svelte 5 runes

import { getContext, setContext } from 'svelte';
import { API_BASE_URL, API_ENDPOINTS, getAuthHeaders, handleApiResponse } from '$lib/api';
import { authUtils } from '$lib/utils/auth.utils';
import type { LoginRequest, LoginResponse, WhoamiResponse } from '$lib/api';

// Authentication state interface
const AuthState = {
	isAuthenticated: false,
	isLoading: false,
	user: null,
	session: null,
	access_token: null,
	refresh_token: null,
	error: null
};

// Create authentication store with Svelte 5 runes
let authState = $state(AuthState);

// Direct API calls for authentication (simplified approach)
async function loginApiCall(credentials) {
	const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGIN}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json'
		},
		body: JSON.stringify(credentials)
	});

	const data = await response.json();
	return handleApiResponse(response, data);
}

async function getCurrentUserApiCall() {
	const accessToken = authUtils.getAccessToken();
	if (!accessToken) throw new Error('No access token');

	const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.WHOAMI}`, {
		method: 'GET',
		headers: getAuthHeaders(accessToken)
	});

	const data = await response.json();
	return handleApiResponse(response, data);
}

async function logoutApiCall() {
	const accessToken = authUtils.getAccessToken();
	if (!accessToken) return;

	try {
		await fetch(`${API_BASE_URL}${API_ENDPOINTS.AUTH.LOGOUT}`, {
			method: 'POST',
			headers: getAuthHeaders(accessToken)
		});
	} catch (error) {
		console.error('Logout API error:', error);
	}
}

export const auth = {
	// Get current state
	get state() {
		return authState;
	},

	// Login action
	async login(credentials) {
		authState.isLoading = true;
		authState.error = null;

		try {
			const response = await loginApiCall(credentials);

			// Store tokens in cookies
			authUtils.setAuthTokens(response.access_token, response.refresh_token);

			// Update state
			authState.isAuthenticated = true;
			authState.isLoading = false;
			authState.access_token = response.access_token;
			authState.refresh_token = response.refresh_token;
			authState.error = null;

			return true;
		} catch (error) {
			authState.isLoading = false;
			authState.error = error.message || 'Login failed';
			return false;
		}
	},

	// Logout action
	async logout() {
		authState.isLoading = true;

		try {
			await logoutApiCall();
		} catch (error) {
			console.error('Logout error:', error);
			// Continue with logout even if API call fails
		}

		// Clear tokens and state
		authUtils.clearAuthTokens();
		authState.isAuthenticated = false;
		authState.isLoading = false;
		authState.user = null;
		authState.session = null;
		authState.access_token = null;
		authState.refresh_token = null;
		authState.error = null;
	},

	// Initialize authentication state from cookies
	async initialize() {
		authState.isLoading = true;

		try {
			if (authUtils.isAuthenticated()) {
				const userResponse = await getCurrentUserApiCall();
				authState.isAuthenticated = true;
				authState.isLoading = false;
				authState.user = userResponse.user;
				authState.session = userResponse.session;
				authState.access_token = authUtils.getAccessToken();
				authState.error = null;
			} else {
				authState.isLoading = false;
			}
		} catch (error) {
			console.error('Auth initialization error:', error);
			// Clear invalid tokens
			authUtils.clearAuthTokens();
			authState.isLoading = false;
			authState.isAuthenticated = false;
			authState.error = 'Session expired';
		}
	},

	// Clear error state
	clearError() {
		authState.error = null;
	}
};

// Auth store key for context
const AUTH_STORE_KEY = Symbol('auth');

// Hook to use auth store in components
export function useAuth() {
	const store = getContext(AUTH_STORE_KEY);
	if (!store) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return store;
}

// Provider component for auth store context
export function setAuthContext() {
	setContext(AUTH_STORE_KEY, auth);
	return auth;
}