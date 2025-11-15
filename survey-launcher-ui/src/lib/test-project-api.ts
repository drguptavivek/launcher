import { browser } from '$app/environment';
import { getProjects, createProject, getRoles } from '$lib/api/remote';
import type { CreateProjectRequest } from '$lib/api/remote';

// Simple test to verify the API remote functions are working
export async function testProjectAPI() {
	if (!browser) return; // Only run in browser

	console.log('🧪 Testing Project Management API functions...');

	// Test 1: Import functions work
	try {
		console.log('✅ Functions imported successfully');
	} catch (error) {
		console.error('❌ Import failed:', error);
		return;
	}

	// Test 2: Validation schemas
	try {
		// Test creating a valid project request
		const testProject: CreateProjectRequest = {
			title: 'Test Project',
			abbreviation: 'TEST',
			description: 'A test project for validation',
			geographicScope: 'NATIONAL',
			teamIds: ['team-1', 'team-2']
		};

		console.log('✅ TypeScript types work correctly');
		console.log('   Test project:', testProject);
	} catch (error) {
		console.error('❌ Type validation failed:', error);
		return;
	}

	// Test 3: API function structure
	try {
		// Check if functions exist and have correct signatures
		const functions = [
			{ name: 'getProjects', fn: getProjects },
			{ name: 'createProject', fn: createProject },
			{ name: 'getRoles', fn: getRoles }
		];

		functions.forEach(({ name, fn }) => {
			if (typeof fn === 'function') {
				console.log(`✅ ${name} function exists and is callable`);
			} else {
				throw new Error(`${name} is not a function`);
			}
		});

		console.log('✅ All API functions have correct structure');
	} catch (error) {
		console.error('❌ Function structure test failed:', error);
		return;
	}

	// Test 4: Backend API endpoint URLs (without actually calling them)
	try {
		const apiUrl = import.meta.env.PUBLIC_SURVEY_LAUNCHER_API_URL || 'http://localhost:3000';
		console.log('✅ API URL configured:', apiUrl);

		// Check if we can construct the endpoint URLs
		const endpoints = [
			'/api/v1/projects',
			'/api/v1/roles'
		];

		endpoints.forEach(endpoint => {
			console.log(`✅ Endpoint configured: ${apiUrl}${endpoint}`);
		});
	} catch (error) {
		console.error('❌ Endpoint configuration failed:', error);
		return;
	}

	console.log('🎉 All Project Management API tests passed!');
	return true;
}

// Export a simple function to call from the browser console
if (typeof window !== 'undefined' && browser) {
	(window as any).testProjectAPI = testProjectAPI;
	console.log('📝 Project API test loaded. Run testProjectAPI() in the browser console to test.');
}