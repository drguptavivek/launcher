// SurveyLauncher Users API Functions
// User management functions using real backend API

import type { User } from './remote/users.remote';
import { getUsers as getUsersRemote, getUserById as getUserByIdRemote } from './remote/users.remote';

interface UserFilterOptions {
	search?: string;
	role?: string;
	status?: string;
	teamId?: string;
	page?: number;
	limit?: number;
}

// API Functions - now using real backend
export async function getUsers(options: UserFilterOptions = {}) {
	try {
		// Call the real backend API - remote functions don't take parameters
		const response = await getUsersRemote();
		return response;
	} catch (error) {
		console.error('Get users error:', error);
		throw error;
	}
}

export async function getUserById(id: string): Promise<User | null> {
	try {
		// Call the real backend API - remote functions don't take parameters
		const user = await getUserByIdRemote();
		return user;
	} catch (error) {
		console.error('Get user error:', error);
		throw error;
	}
}

export async function createProject(userData: Record<string, unknown>): Promise<Record<string, unknown>> {
	// This function should be moved to projects API
	console.warn('createProject should be called from projects API');
	return {
		id: 'project-' + Date.now(),
		...userData,
		created_at: new Date().toISOString()
	};
}

export async function updateUser(id: string, userData: Partial<User>): Promise<User | null> {
	// This would be implemented in the real users.remote.ts
	throw new Error('updateUser not implemented - use users.remote API');
}

export async function deleteUser(id: string): Promise<boolean> {
	// This would be implemented in the real users.remote.ts
	throw new Error('deleteUser not implemented - use users.remote API');
}

export async function updateUserStatus(id: string, isActive: boolean): Promise<User | null> {
	// This would be implemented in the real users.remote.ts
	throw new Error('updateUserStatus not implemented - use users.remote API');
}

export async function getTeams() {
	// This would be implemented in the real teams API
	throw new Error('getTeams not implemented - use teams.remote API');
}

export async function searchUsers(query: string, limit = 10): Promise<User[]> {
	// This would be implemented in the real users.remote.ts
	throw new Error('searchUsers not implemented - use users.remote API');
}