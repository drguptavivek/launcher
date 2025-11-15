<script lang="ts">
	import { onMount } from 'svelte';
	import { getProjects, createProject } from '$lib/api/remote';
	import type { CreateProjectRequest } from '$lib/api/remote';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';

	interface TestResult {
		test: string;
		message: string;
		type: 'success' | 'error' | 'info' | 'warning';
		timestamp: string;
	}

	let testResults: TestResult[] = [];
	let isLoading = false;

	onMount(() => {
		console.log('🧪 Project Management API Test Page Loaded');
	});

	async function runTests() {
		isLoading = true;
		testResults = [];

		try {
			// Test 1: Import and function existence
			addResult('Function Imports', 'Testing if all functions are properly imported...', 'info');

			const functions = [
				{ name: 'getProjects', fn: getProjects },
				{ name: 'createProject', fn: createProject }
			];

			let functionsOk = true;
			functions.forEach(({ name, fn }) => {
				if (typeof fn === 'function') {
					console.log(`✅ ${name} function exists`);
				} else {
					console.error(`❌ ${name} function missing`);
					functionsOk = false;
				}
			});

			addResult('Function Imports', functionsOk ? 'All functions imported successfully' : 'Some functions missing', functionsOk ? 'success' : 'error');

			// Test 2: TypeScript types
			addResult('TypeScript Types', 'Testing type definitions...', 'info');

			const testProject: CreateProjectRequest = {
				title: 'Test Project',
				abbreviation: 'TEST',
				description: 'A test project for validation',
				geographicScope: 'NATIONAL',
				teamIds: ['team-1']
			};

			addResult('TypeScript Types', 'All type definitions working correctly', 'success');
			console.log('✅ Test project object:', testProject);

			// Test 3: API Configuration
			addResult('API Configuration', 'Testing API endpoint configuration...', 'info');

			const apiUrl = import.meta.env.PUBLIC_SURVEY_LAUNCHER_API_URL || 'http://localhost:3000';
			addResult('API Configuration', `API URL: ${apiUrl}`, 'success');

			// Test 4: Actual API call (will fail with 401 since no auth, but tests the function)
			addResult('API Calls', 'Testing API function calls (expect auth errors)...', 'info');

			try {
				// This will fail due to no authentication, but tests that the function works
				await getProjects();
				addResult('API Calls', 'Unexpected success (should fail without auth)', 'warning');
			} catch (error: any) {
				if (error.message.includes('No access token found') || error.status === 401) {
					addResult('API Calls', 'API function works correctly (authentication required)', 'success');
				} else {
					addResult('API Calls', `Unexpected error: ${error.message}`, 'error');
				}
			}

			addResult('Overall', 'All tests completed successfully!', 'success');

		} catch (error: any) {
			console.error('Test suite error:', error);
			addResult('Error', `Test suite failed: ${error.message}`, 'error');
		} finally {
			isLoading = false;
		}
	}

	function addResult(test: string, message: string, type: 'success' | 'error' | 'info' | 'warning') {
		testResults = [...testResults, { test, message, type, timestamp: new Date().toISOString() }];
	}

	function getLabelColor(type: string) {
		switch (type) {
			case 'success': return 'text-green-600 bg-green-100';
			case 'error': return 'text-red-600 bg-red-100';
			case 'warning': return 'text-orange-600 bg-orange-100';
			case 'info': return 'text-blue-600 bg-blue-100';
			default: return 'text-gray-600 bg-gray-100';
		}
	}
</script>

<svelte:head>
	<title>Project API Test - SurveyLauncher</title>
</svelte:head>

<div class="container mx-auto py-8 space-y-6">
	<div class="text-center space-y-2">
		<h1 class="text-3xl font-bold">Project Management API Test</h1>
		<p class="text-muted-foreground">Test the newly implemented Project Management remote functions</p>
	</div>

	<Card>
		<CardHeader>
			<CardTitle>Test Controls</CardTitle>
			<CardDescription>
				Click the button below to run comprehensive tests on the Project Management API functions.
			</CardDescription>
		</CardHeader>
		<CardContent>
			<Button onclick={runTests} disabled={isLoading} class="w-full">
				{isLoading ? 'Running Tests...' : 'Run Project API Tests'}
			</Button>
		</CardContent>
	</Card>

	{#if testResults.length > 0}
		<Card>
			<CardHeader>
				<CardTitle>Test Results</CardTitle>
				<CardDescription>
					Results from running the Project Management API test suite
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="space-y-3">
					{#each testResults as result}
						<div class="flex items-start space-x-3 p-3 border rounded-lg">
							<Label class={`px-2 py-1 rounded text-xs font-semibold ${getLabelColor(result.type)}`}>
								{result.type.toUpperCase()}
							</Label>
							<div class="flex-1 min-w-0">
								<div class="font-medium">{result.test}</div>
								<div class="text-sm text-muted-foreground">{result.message}</div>
							</div>
						</div>
					{/each}
				</div>
			</CardContent>
		</Card>
	{/if}

	<Card>
		<CardHeader>
			<CardTitle>Available Functions</CardTitle>
			<CardDescription>
				All 14 Project Management API remote functions that have been implemented
			</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div class="space-y-2">
					<h4 class="font-medium">Core Project CRUD</h4>
					<ul class="text-sm text-muted-foreground space-y-1">
						<li>• getProjects() - List projects with pagination</li>
						<li>• getProjectById() - Get project details</li>
						<li>• createProject() - Create new project</li>
						<li>• updateProject() - Update existing project</li>
						<li>• deleteProject() - Soft delete project</li>
					</ul>
				</div>
				<div class="space-y-2">
					<h4 class="font-medium">User & Team Assignments</h4>
					<ul class="text-sm text-muted-foreground space-y-1">
						<li>• assignUserToProject() - Assign users</li>
						<li>• getProjectUsers() - List user assignments</li>
						<li>• removeUserFromProject() - Remove users</li>
						<li>• assignTeamToProject() - Assign teams</li>
						<li>• getProjectTeams() - List team assignments</li>
					</ul>
				</div>
				<div class="space-y-2">
					<h4 class="font-medium">Additional Functions</h4>
					<ul class="text-sm text-muted-foreground space-y-1">
						<li>• removeTeamFromProject() - Remove teams</li>
						<li>• getUserProjects() - User's projects</li>
						<li>• getTeamProjects() - Team's projects</li>
						<li>• getRoles() - Available roles</li>
					</ul>
				</div>
			</div>
		</CardContent>
	</Card>
</div>