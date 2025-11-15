// SurveyLauncher Project Management Utilities
// Utility functions for project validation and form handling

import type { ValidationError } from './projects.types';

export const validateProjectTitle = (title: string): string[] => {
	const errors: string[] = [];
	if (!title) {
		errors.push('Project title is required');
	} else if (title.length < 3) {
		errors.push('Project title must be at least 3 characters long');
	} else if (title.length > 255) {
		errors.push('Project title must be 255 characters or less');
	}
	return errors;
};

export const validateProjectAbbreviation = (abbreviation: string): string[] => {
	const errors: string[] = [];
	if (!abbreviation) {
		errors.push('Project abbreviation is required');
	} else if (abbreviation.length < 2) {
		errors.push('Project abbreviation must be at least 2 characters long');
	} else if (abbreviation.length > 50) {
		errors.push('Project abbreviation must be 50 characters or less');
	} else if (!/^[A-Z0-9-_]+$/.test(abbreviation.toUpperCase())) {
		errors.push('Project abbreviation can only contain letters, numbers, hyphens, and underscores');
	}
	return errors;
};

export const validateGeographicScope = (scope: string): string[] => {
	const errors: string[] = [];
	if (!scope) {
		errors.push('Geographic scope is required');
	} else if (!['NATIONAL', 'REGIONAL'].includes(scope)) {
		errors.push('Geographic scope must be either NATIONAL or REGIONAL');
	}
	return errors;
};

// Comprehensive project validation
export const validateProject = (projectData: {
	title?: string;
	abbreviation?: string;
	geographicScope?: string;
	description?: string;
}): ValidationError[] => {
	const errors: ValidationError[] = [];

	// Title validation
	const titleErrors = validateProjectTitle(projectData.title || '');
	titleErrors.forEach(message => {
		errors.push({ field: 'title', message, code: 'INVALID_TITLE' });
	});

	// Abbreviation validation
	const abbreviationErrors = validateProjectAbbreviation(projectData.abbreviation || '');
	abbreviationErrors.forEach(message => {
		errors.push({ field: 'abbreviation', message, code: 'INVALID_ABBREVIATION' });
	});

	// Geographic scope validation
	const scopeErrors = validateGeographicScope(projectData.geographicScope || '');
	scopeErrors.forEach(message => {
		errors.push({ field: 'geographicScope', message, code: 'INVALID_GEOGRAPHIC_SCOPE' });
	});

	return errors;
};

// Status helpers
export const getProjectStatusColor = (status: 'ACTIVE' | 'INACTIVE'): string => {
	switch (status) {
		case 'ACTIVE':
			return 'text-green-600 bg-green-100';
		case 'INACTIVE':
			return 'text-gray-600 bg-gray-100';
		default:
			return 'text-gray-600 bg-gray-100';
	}
};

export const getGeographicScopeLabel = (scope: 'NATIONAL' | 'REGIONAL'): string => {
	switch (scope) {
		case 'NATIONAL':
			return 'National';
		case 'REGIONAL':
			return 'Regional';
		default:
			return scope;
	}
};

// Assignment scope helpers
export const getAssignmentScopeColor = (scope: 'READ' | 'EXECUTE' | 'UPDATE' | 'PARTICIPATE' | 'MANAGE'): string => {
	switch (scope) {
		case 'READ':
			return 'text-blue-600 bg-blue-100';
		case 'EXECUTE':
			return 'text-green-600 bg-green-100';
		case 'UPDATE':
			return 'text-orange-600 bg-orange-100';
		case 'PARTICIPATE':
			return 'text-purple-600 bg-purple-100';
		case 'MANAGE':
			return 'text-red-600 bg-red-100';
		default:
			return 'text-gray-600 bg-gray-100';
	}
};

export const getAssignmentScopeLabel = (scope: 'READ' | 'EXECUTE' | 'UPDATE' | 'PARTICIPATE' | 'MANAGE'): string => {
	switch (scope) {
		case 'READ':
			return 'Read Only';
		case 'EXECUTE':
			return 'Execute';
		case 'UPDATE':
			return 'Update';
		case 'PARTICIPATE':
			return 'Participate';
		case 'MANAGE':
			return 'Manage';
		default:
			return scope;
	}
};

// Date formatting helpers
export const formatDate = (date: string | Date): string => {
	const d = typeof date === 'string' ? new Date(date) : date;
	return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
};

export const isAssignmentActive = (assignedAt: string, assignedUntil?: string): boolean => {
	const now = new Date();
	const assigned = new Date(assignedAt);

	if (assignedUntil) {
		const until = new Date(assignedUntil);
		return assigned <= now && now < until;
	}

	return assigned <= now;
};