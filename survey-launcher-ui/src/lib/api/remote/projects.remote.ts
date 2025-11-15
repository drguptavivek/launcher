// SurveyLauncher Project Management Remote Functions
// Type-safe remote functions for all project management endpoints

import { form, query, command } from '$app/server';
import { getRequestEvent } from '$app/server';
import * as v from 'valibot';
import {
	API_BASE_URL,
	API_ENDPOINTS,
	getAuthHeaders,
	handleApiResponse
} from '../client';
import type {
	Project,
	CreateProjectRequest,
	UpdateProjectRequest,
	ProjectsResponse,
	ProjectResponse,
	ProjectsFilterOptions,
	UserAssignment,
	TeamAssignment,
	AssignUserToProjectRequest,
	AssignTeamToProjectRequest,
	UserAssignmentsResponse,
	TeamAssignmentsResponse,
	UserProjectsResponse,
	TeamProjectsResponse,
	ValidationError,
	ApiError
} from './projects.types';

// Validation schemas
const CreateProjectSchema = v.object({
	title: v.pipe(v.string(), v.nonEmpty('Project title is required')),
	abbreviation: v.pipe(v.string(), v.nonEmpty('Project abbreviation is required'), v.maxLength(50, 'Abbreviation must be 50 characters or less')),
	description: v.optional(v.string()),
	geographicScope: v.enum(['NATIONAL' as const, 'REGIONAL' as const]),
	teamIds: v.optional(v.array(v.string()))
});

const UpdateProjectSchema = v.object({
	title: v.optional(v.pipe(v.string(), v.nonEmpty('Project title is required'))),
	abbreviation: v.optional(v.pipe(v.string(), v.nonEmpty('Project abbreviation is required'), v.maxLength(50, 'Abbreviation must be 50 characters or less'))),
	description: v.optional(v.string()),
	status: v.optional(v.enum(['ACTIVE' as const, 'INACTIVE' as const])),
	geographicScope: v.optional(v.enum(['NATIONAL' as const, 'REGIONAL' as const])),
	teamIds: v.optional(v.array(v.string()))
});

const AssignUserSchema = v.object({
	userId: v.pipe(v.string(), v.nonEmpty('User ID is required')),
	scope: v.enum(['READ' as const, 'EXECUTE' as const, 'UPDATE' as const]),
	roleInProject: v.optional(v.string()),
	assignedUntil: v.optional(v.string())
});

const AssignTeamSchema = v.object({
	teamId: v.pipe(v.string(), v.nonEmpty('Team ID is required')),
	scope: v.enum(['READ' as const, 'PARTICIPATE' as const, 'MANAGE' as const]),
	assignedRole: v.optional(v.string()),
	assignedUntil: v.optional(v.string())
});

// Helper function to get access token from cookies
function getAccessToken(): string {
	const event = getRequestEvent();
	const accessToken = event.cookies.get('access_token');
	if (!accessToken) {
		throw new Error('No access token found. Please login first.');
	}
	return accessToken;
}

// Helper function to build query string from options
function buildQueryString(options: Record<string, any>): string {
	const params = new URLSearchParams();
	Object.entries(options).forEach(([key, value]) => {
		if (value !== undefined && value !== null && value !== '') {
			params.append(key, String(value));
		}
	});
	const queryString = params.toString();
	return queryString ? `?${queryString}` : '';
}

/**
 * Get all projects with pagination and filtering
 * GET /api/v1/projects
 */
export const getProjects = query(async (options: ProjectsFilterOptions = {}) => {
	try {
		const accessToken = getAccessToken();
		const queryString = buildQueryString(options);
		const url = `${API_BASE_URL}${API_ENDPOINTS.PROJECTS}${queryString}`;

		const response = await fetch(url, {
			method: 'GET',
			headers: getAuthHeaders(accessToken)
		});

		const data = await response.json();
		return handleApiResponse(response, data) as ProjectsResponse;
	} catch (error) {
		console.error('Get projects error:', error);
		throw error;
	}
});

/**
 * Get project by ID
 * GET /api/v1/projects/:id
 */
export const getProjectById = query(async (id: string) => {
	try {
		const accessToken = getAccessToken();
		const url = `${API_BASE_URL}${API_ENDPOINTS.PROJECT(id)}`;

		const response = await fetch(url, {
			method: 'GET',
			headers: getAuthHeaders(accessToken)
		});

		const data = await response.json();
		return handleApiResponse(response, data) as ProjectResponse;
	} catch (error) {
		console.error('Get project error:', error);
		throw error;
	}
});

/**
 * Create a new project
 * POST /api/v1/projects
 */
export const createProject = form(
	CreateProjectSchema,
	async (projectData) => {
		try {
			const accessToken = getAccessToken();
			const url = `${API_BASE_URL}${API_ENDPOINTS.PROJECTS}`;

			const response = await fetch(url, {
				method: 'POST',
				headers: getAuthHeaders(accessToken),
				body: JSON.stringify(projectData as CreateProjectRequest)
			});

			const data = await response.json();
			return handleApiResponse(response, data) as ProjectResponse;
		} catch (error) {
			console.error('Create project error:', error);
			throw error;
		}
	}
);

/**
 * Update an existing project
 * PUT /api/v1/projects/:id
 */
export const updateProject = command(async ({ id, updateData }: { id: string; updateData: Partial<UpdateProjectRequest> }) => {
	try {
		const accessToken = getAccessToken();
		const url = `${API_BASE_URL}${API_ENDPOINTS.PROJECT(id)}`;

		// Validate update data
		const validatedData = UpdateProjectSchema.parse(updateData);

		const response = await fetch(url, {
			method: 'PUT',
			headers: getAuthHeaders(accessToken),
			body: JSON.stringify(validatedData)
		});

		const data = await response.json();
		return handleApiResponse(response, data) as ProjectResponse;
	} catch (error) {
		console.error('Update project error:', error);
		throw error;
	}
});

/**
 * Soft delete a project
 * DELETE /api/v1/projects/:id
 */
export const deleteProject = command(async (id: string) => {
	try {
		const accessToken = getAccessToken();
		const url = `${API_BASE_URL}${API_ENDPOINTS.PROJECT(id)}`;

		const response = await fetch(url, {
			method: 'DELETE',
			headers: getAuthHeaders(accessToken)
		});

		const data = await response.json();
		return handleApiResponse(response, data);
	} catch (error) {
		console.error('Delete project error:', error);
		throw error;
	}
});

/**
 * Assign user to project
 * POST /api/v1/projects/:id/users
 */
export const assignUserToProject = form(
	AssignUserSchema,
	async ({ projectId, userData }: { projectId: string; userData: AssignUserToProjectRequest }) => {
		try {
			const accessToken = getAccessToken();
			const url = `${API_BASE_URL}${API_ENDPOINTS.PROJECT_USERS(projectId)}`;

			const response = await fetch(url, {
				method: 'POST',
				headers: getAuthHeaders(accessToken),
				body: JSON.stringify({
					userId: userData.userId,
					scope: userData.scope,
					roleInProject: userData.roleInProject,
					assignedUntil: userData.assignedUntil
				})
			});

			const data = await response.json();
			return handleApiResponse(response, data);
		} catch (error) {
			console.error('Assign user to project error:', error);
			throw error;
		}
	}
);

/**
 * Get project user assignments
 * GET /api/v1/projects/:id/users
 */
export const getProjectUsers = query(async (projectId: string, options: any = {}) => {
	try {
		const accessToken = getAccessToken();
		const queryString = buildQueryString(options);
		const url = `${API_BASE_URL}${API_ENDPOINTS.PROJECT_USERS(projectId)}${queryString}`;

		const response = await fetch(url, {
			method: 'GET',
			headers: getAuthHeaders(accessToken)
		});

		const data = await response.json();
		return handleApiResponse(response, data) as UserAssignmentsResponse;
	} catch (error) {
		console.error('Get project users error:', error);
		throw error;
	}
});

/**
 * Remove user from project
 * DELETE /api/v1/projects/:id/users/:userId
 */
export const removeUserFromProject = command(async ({ projectId, userId }: { projectId: string; userId: string }) => {
	try {
		const accessToken = getAccessToken();
		const url = `${API_BASE_URL}${API_ENDPOINTS.PROJECT_USER(projectId, userId)}`;

		const response = await fetch(url, {
			method: 'DELETE',
			headers: getAuthHeaders(accessToken)
		});

		const data = await response.json();
		return handleApiResponse(response, data);
	} catch (error) {
		console.error('Remove user from project error:', error);
		throw error;
	}
});

/**
 * Assign team to project
 * POST /api/v1/projects/:id/teams
 */
export const assignTeamToProject = form(
	AssignTeamSchema,
	async ({ projectId, teamData }: { projectId: string; teamData: AssignTeamToProjectRequest }) => {
		try {
			const accessToken = getAccessToken();
			const url = `${API_BASE_URL}${API_ENDPOINTS.PROJECT_TEAMS(projectId)}`;

			const response = await fetch(url, {
				method: 'POST',
				headers: getAuthHeaders(accessToken),
				body: JSON.stringify({
					teamId: teamData.teamId,
					scope: teamData.scope,
					assignedRole: teamData.assignedRole,
					assignedUntil: teamData.assignedUntil
				})
			});

			const data = await response.json();
			return handleApiResponse(response, data);
		} catch (error) {
			console.error('Assign team to project error:', error);
			throw error;
		}
	}
);

/**
 * Get project team assignments
 * GET /api/v1/projects/:id/teams
 */
export const getProjectTeams = query(async (projectId: string, options: any = {}) => {
	try {
		const accessToken = getAccessToken();
		const queryString = buildQueryString(options);
		const url = `${API_BASE_URL}${API_ENDPOINTS.PROJECT_TEAMS(projectId)}${queryString}`;

		const response = await fetch(url, {
			method: 'GET',
			headers: getAuthHeaders(accessToken)
		});

		const data = await response.json();
		return handleApiResponse(response, data) as TeamAssignmentsResponse;
	} catch (error) {
		console.error('Get project teams error:', error);
		throw error;
	}
});

/**
 * Remove team from project
 * DELETE /api/v1/projects/:id/teams/:teamId
 */
export const removeTeamFromProject = command(async ({ projectId, teamId }: { projectId: string; teamId: string }) => {
	try {
		const accessToken = getAccessToken();
		const url = `${API_BASE_URL}${API_ENDPOINTS.PROJECT_TEAM(projectId, teamId)}`;

		const response = await fetch(url, {
			method: 'DELETE',
			headers: getAuthHeaders(accessToken)
		});

		const data = await response.json();
		return handleApiResponse(response, data);
	} catch (error) {
		console.error('Remove team from project error:', error);
		throw error;
	}
});

/**
 * Get user's project assignments
 * GET /api/v1/users/:userId/projects
 */
export const getUserProjects = query(async (userId: string, options: any = {}) => {
	try {
		const accessToken = getAccessToken();
		const queryString = buildQueryString(options);
		const url = `${API_BASE_URL}${API_ENDPOINTS.USER_PROJECTS(userId)}${queryString}`;

		const response = await fetch(url, {
			method: 'GET',
			headers: getAuthHeaders(accessToken)
		});

		const data = await response.json();
		return handleApiResponse(response, data) as UserProjectsResponse;
	} catch (error) {
		console.error('Get user projects error:', error);
		throw error;
	}
});

/**
 * Get team's project assignments
 * GET /api/v1/teams/:teamId/projects
 */
export const getTeamProjects = query(async (teamId: string, options: any = {}) => {
	try {
		const accessToken = getAccessToken();
		const queryString = buildQueryString(options);
		const url = `${API_BASE_URL}${API_ENDPOINTS.TEAM_PROJECTS(teamId)}${queryString}`;

		const response = await fetch(url, {
			method: 'GET',
			headers: getAuthHeaders(accessToken)
		});

		const data = await response.json();
		return handleApiResponse(response, data) as TeamProjectsResponse;
	} catch (error) {
		console.error('Get team projects error:', error);
		throw error;
	}
});

/**
 * Get all available roles
 * GET /api/v1/roles
 */
export const getRoles = query(async (options: any = {}) => {
	try {
		const accessToken = getAccessToken();
		const queryString = buildQueryString(options);
		const url = `${API_BASE_URL}${API_ENDPOINTS.ROLES}${queryString}`;

		const response = await fetch(url, {
			method: 'GET',
			headers: getAuthHeaders(accessToken)
		});

		const data = await response.json();
		return handleApiResponse(response, data);
	} catch (error) {
		console.error('Get roles error:', error);
		throw error;
	}
});

// Utility functions for form validation
// Utility functions are now in projects.utils.ts to avoid SvelteKit remote function export restrictions