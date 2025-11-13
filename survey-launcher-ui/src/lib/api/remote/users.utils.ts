// SurveyLauncher Users API Utilities
// User-related utilities, types, and validation schemas

import { z } from 'zod';

// User interfaces
export interface User {
	id: string;
	name: string;
	email: string;
	userCode: string;
	role: 'admin' | 'supervisor' | 'user' | 'readonly';
	teamName: string;
	teamId: string;
	deviceId: string;
	isActive: boolean;
	lastLogin: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface CreateUserRequest {
	name: string;
	email: string;
	userCode: string;
	role: User['role'];
	teamId: string;
	deviceId: string;
	pin: string;
	isActive?: boolean;
}

export interface UpdateUserRequest {
	name?: string;
	email?: string;
	role?: User['role'];
	teamId?: string;
	deviceId?: string;
	pin?: string;
	isActive?: boolean;
}

export interface UsersFilterOptions {
	search?: string;
	role?: User['role'] | 'all';
	status?: 'active' | 'inactive' | 'all';
	teamId?: string;
	page?: number;
	limit?: number;
}

export interface UsersResponse {
	users: User[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

// Validation schemas
export const createUserSchema = z.object({
	name: z.string().min(2, 'Name must be at least 2 characters'),
	email: z.string().email('Please enter a valid email address'),
	userCode: z.string().min(1, 'User code is required').regex(/^[a-zA-Z0-9-]+$/, 'User code can only contain letters, numbers, and hyphens'),
	role: z.enum(['admin', 'supervisor', 'user', 'readonly']),
	teamId: z.string().min(1, 'Team is required'),
	deviceId: z.string().min(1, 'Device ID is required'),
	pin: z.string().min(6, 'PIN must be at least 6 characters').regex(/^\d+$/, 'PIN must contain only numbers'),
	isActive: z.boolean().default(true)
});

export const updateUserSchema = createUserSchema.partial();

// User validation utilities
export function validateUserCode(userCode: string): boolean {
	return /^[a-zA-Z0-9-]+$/.test(userCode) && userCode.length >= 1;
}

export function validateUserEmail(email: string): boolean {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateUserPin(pin: string): boolean {
	return /^\d{6,}$/.test(pin);
}

// User role utilities
export const USER_ROLES = {
	ADMIN: 'admin',
	SUPERVISOR: 'supervisor',
	USER: 'user',
	READONLY: 'readonly'
} as const;

export const USER_ROLE_LABELS = {
	admin: 'Administrator',
	supervisor: 'Supervisor',
	user: 'User',
	readonly: 'Read Only'
};

export function hasPermission(userRole: User['role'], requiredRole: User['role']): boolean {
	const roleHierarchy = ['readonly', 'user', 'supervisor', 'admin'];
	const userIndex = roleHierarchy.indexOf(userRole);
	const requiredIndex = roleHierarchy.indexOf(requiredRole);

	return userIndex >= requiredIndex;
}

export function canManageUsers(userRole: User['role']): boolean {
	return hasPermission(userRole, 'admin');
}

export function canOverrideSupervisor(userRole: User['role']): boolean {
	return hasPermission(userRole, 'supervisor');
}