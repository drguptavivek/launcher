// Simple project remote functions for SvelteKit
// Using proper SvelteKit remote function patterns

import { form, query } from '$app/server';
import { getRequestEvent } from '$app/server';
import * as v from 'valibot';
import {
	API_BASE_URL,
	API_ENDPOINTS,
	getAuthHeaders,
	handleApiResponse
} from '../client';
import type { CreateProjectRequest } from '$lib/api/remote/projects.types';

// Helper function to get access token from cookies
function getAccessToken(): string {
	const event = getRequestEvent();
	const accessToken = event.cookies.get('access_token');
	if (!accessToken) {
		throw new Error('No access token found. Please login first.');
	}
	return accessToken;
}

/**
 * Get all projects
 * GET /api/v1/projects
 */
export const getProjects = query(async () => {
	try {
		const accessToken = getAccessToken();
		const url = `${API_BASE_URL}${API_ENDPOINTS.PROJECTS}`;

		const response = await fetch(url, {
			method: 'GET',
			headers: getAuthHeaders(accessToken)
		});

		const data = await response.json();
		return handleApiResponse(response, data);
	} catch (error) {
		console.error('Get projects error:', error);
		throw error;
	}
});

/**
 * Create a new project
 * POST /api/v1/projects
 */
export const createProject = form(
	// Validation schema matching CreateProjectRequest interface
	v.object({
		title: v.string(),
		abbreviation: v.string(),
		description: v.optional(v.string()),
		geographicScope: v.picklist(['NATIONAL', 'REGIONAL']),
		teamIds: v.optional(v.array(v.string()))
	}),
	async (formData: CreateProjectRequest) => {
		try {
			const accessToken = getAccessToken();
			const url = `${API_BASE_URL}${API_ENDPOINTS.PROJECTS}`;

			const response = await fetch(url, {
				method: 'POST',
				headers: getAuthHeaders(accessToken),
				body: JSON.stringify(formData)
			});

			const data = await response.json();
			return handleApiResponse(response, data);
		} catch (error) {
			console.error('Create project error:', error);
			throw error;
		}
	}
);