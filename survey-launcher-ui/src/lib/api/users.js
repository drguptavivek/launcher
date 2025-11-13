// SurveyLauncher Users API Functions
// User management functions using mock data for development

import {
	createUserSchema,
	updateUserSchema
} from './remote/users.utils.js';

// Mock database for demonstration
// In a real implementation, this would connect to your backend database
let mockUsers = [
	{
		id: 'user-001',
		name: 'John Doe',
		email: 'john.doe@surveylauncher.com',
		userCode: 'u001',
		role: 'admin',
		teamName: 'Alpha Team',
		teamId: 'team-001',
		deviceId: 'dev-mock-001',
		isActive: true,
		lastLogin: new Date('2024-01-15T10:30:00Z'),
		createdAt: new Date('2024-01-01T00:00:00Z'),
		updatedAt: new Date('2024-01-15T10:30:00Z')
	},
	{
		id: 'user-002',
		name: 'Jane Smith',
		email: 'jane.smith@surveylauncher.com',
		userCode: 'u002',
		role: 'supervisor',
		teamName: 'Beta Team',
		teamId: 'team-002',
		deviceId: 'dev-mock-002',
		isActive: true,
		lastLogin: new Date('2024-01-14T15:45:00Z'),
		createdAt: new Date('2024-01-02T00:00:00Z'),
		updatedAt: new Date('2024-01-14T15:45:00Z')
	},
	{
		id: 'user-003',
		name: 'Robert Johnson',
		email: 'robert.johnson@surveylauncher.com',
		userCode: 'u003',
		role: 'user',
		teamName: 'Alpha Team',
		teamId: 'team-001',
		deviceId: 'dev-mock-003',
		isActive: false,
		lastLogin: new Date('2024-01-10T09:15:00Z'),
		createdAt: new Date('2024-01-03T00:00:00Z'),
		updatedAt: new Date('2024-01-10T09:15:00Z')
	},
	{
		id: 'user-004',
		name: 'Sarah Williams',
		email: 'sarah.williams@surveylauncher.com',
		userCode: 'u004',
		role: 'user',
		teamName: 'Gamma Team',
		teamId: 'team-003',
		deviceId: 'dev-mock-004',
		isActive: true,
		lastLogin: new Date('2024-01-13T14:20:00Z'),
		createdAt: new Date('2024-01-04T00:00:00Z'),
		updatedAt: new Date('2024-01-13T14:20:00Z')
	},
	{
		id: 'user-005',
		name: 'Michael Brown',
		email: 'michael.brown@surveylauncher.com',
		userCode: 'u005',
		role: 'readonly',
		teamName: 'Beta Team',
		teamId: 'team-002',
		deviceId: 'dev-mock-005',
		isActive: true,
		lastLogin: new Date('2024-01-12T11:10:00Z'),
		createdAt: new Date('2024-01-05T00:00:00Z'),
		updatedAt: new Date('2024-01-12T11:10:00Z')
	}
];

// Mock teams data
const mockTeams = [
	{ id: 'team-001', name: 'Alpha Team' },
	{ id: 'team-002', name: 'Beta Team' },
	{ id: 'team-003', name: 'Gamma Team' }
];

// API Functions
export async function getUsers(options = {}) {
	// Simulate API delay
	await new Promise(resolve => setTimeout(resolve, 300));

	const {
		search = '',
		role = 'all',
		status = 'all',
		teamId = '',
		page = 1,
		limit = 50
	} = options;

	// Filter users
	let filteredUsers = mockUsers.filter(user => {
		// Search filter
		if (search) {
			const searchLower = search.toLowerCase();
			const matchesSearch =
				user.name.toLowerCase().includes(searchLower) ||
				user.email.toLowerCase().includes(searchLower) ||
				user.userCode.toLowerCase().includes(searchLower);
			if (!matchesSearch) return false;
		}

		// Role filter
		if (role !== 'all' && user.role !== role) return false;

		// Status filter
		if (status !== 'all') {
			const isActive = status === 'active';
			if (user.isActive !== isActive) return false;
		}

		// Team filter
		if (teamId && user.teamId !== teamId) return false;

		return true;
	});

	// Pagination
	const total = filteredUsers.length;
	const totalPages = Math.ceil(total / limit);
	const startIndex = (page - 1) * limit;
	const endIndex = startIndex + limit;
	const users = filteredUsers.slice(startIndex, endIndex);

	return {
		users,
		total,
		page,
		limit,
		totalPages
	};
}

export async function getUserById(id) {
	// Simulate API delay
	await new Promise(resolve => setTimeout(resolve, 200));

	const user = mockUsers.find(u => u.id === id);
	return user || null;
}

export async function createUser(userData) {
	// Simulate API delay
	await new Promise(resolve => setTimeout(resolve, 500));

	// Validate input
	const validatedData = createUserSchema.parse(userData);

	// Check if user code already exists
	const existingUser = mockUsers.find(u => u.userCode === validatedData.userCode);
	if (existingUser) {
		throw new Error('User code already exists');
	}

	// Check if email already exists
	const existingEmail = mockUsers.find(u => u.email === validatedData.email);
	if (existingEmail) {
		throw new Error('Email already exists');
	}

	// Get team name
	const team = mockTeams.find(t => t.id === validatedData.teamId);
	if (!team) {
		throw new Error('Team not found');
	}

	// Create new user
	const newUser = {
		id: `user-${Date.now()}`,
		name: validatedData.name,
		email: validatedData.email,
		userCode: validatedData.userCode,
		role: validatedData.role,
		teamName: team.name,
		teamId: validatedData.teamId,
		deviceId: validatedData.deviceId,
		isActive: validatedData.isActive ?? true,
		lastLogin: null,
		createdAt: new Date(),
		updatedAt: new Date()
	};

	// Add to mock database
	mockUsers.push(newUser);

	return newUser;
}

export async function updateUser(id, userData) {
	// Simulate API delay
	await new Promise(resolve => setTimeout(resolve, 400));

	// Validate input
	const validatedData = updateUserSchema.parse(userData);

	// Find user
	const userIndex = mockUsers.findIndex(u => u.id === id);
	if (userIndex === -1) {
		throw new Error('User not found');
	}

	// Check for duplicate user code if changed
	if (validatedData.userCode && validatedData.userCode !== mockUsers[userIndex].userCode) {
		const existingUser = mockUsers.find(u => u.userCode === validatedData.userCode && u.id !== id);
		if (existingUser) {
			throw new Error('User code already exists');
		}
	}

	// Check for duplicate email if changed
	if (validatedData.email && validatedData.email !== mockUsers[userIndex].email) {
		const existingEmail = mockUsers.find(u => u.email === validatedData.email && u.id !== id);
		if (existingEmail) {
			throw new Error('Email already exists');
		}
	}

	// Get team name if team changed
	let teamName = mockUsers[userIndex].teamName;
	if (validatedData.teamId && validatedData.teamId !== mockUsers[userIndex].teamId) {
		const team = mockTeams.find(t => t.id === validatedData.teamId);
		if (!team) {
			throw new Error('Team not found');
		}
		teamName = team.name;
	}

	// Update user
	const updatedUser = {
		...mockUsers[userIndex],
		...validatedData,
		teamName: teamName,
		updatedAt: new Date()
	};

	mockUsers[userIndex] = updatedUser;

	return updatedUser;
}

export async function deleteUser(id) {
	// Simulate API delay
	await new Promise(resolve => setTimeout(resolve, 300));

	// Find user
	const userIndex = mockUsers.findIndex(u => u.id === id);
	if (userIndex === -1) {
		throw new Error('User not found');
	}

	// Remove user from mock database
	mockUsers.splice(userIndex, 1);
}

export async function updateUserStatus(id, isActive) {
	// Simulate API delay
	await new Promise(resolve => setTimeout(resolve, 200));

	return await updateUser(id, { isActive });
}

export async function getTeams() {
	// Simulate API delay
	await new Promise(resolve => setTimeout(resolve, 100));

	return mockTeams;
}

export async function searchUsers(query, limit = 10) {
	// Simulate API delay
	await new Promise(resolve => setTimeout(resolve, 150));

	const searchLower = query.toLowerCase();
	return mockUsers
		.filter(user =>
			user.name.toLowerCase().includes(searchLower) ||
			user.email.toLowerCase().includes(searchLower) ||
			user.userCode.toLowerCase().includes(searchLower)
		)
		.slice(0, limit);
}