<script lang="ts">
	import { ProjectTable, ProjectCard, ProjectForm, UserAssignment as UserAssignmentComponent, ProjectActions } from '$lib/components/projects';
	import { Button } from '$lib/components/ui/button';
	import type { Project, UserAssignment, CreateProjectRequest, UpdateProjectRequest } from '$lib/api/remote';

	// Mock data for testing components
	let mockProjects: Project[] = [
		{
			id: 'proj-001',
			title: 'National Health Survey 2025',
			abbreviation: 'NHS25',
			description: 'Comprehensive health assessment survey covering all regions',
			status: 'ACTIVE',
			geographicScope: 'NATIONAL',
			organizationId: 'org-001',
			createdBy: 'admin-001',
			createdAt: '2025-01-15T10:00:00Z',
			updatedAt: '2025-01-20T14:30:00Z'
		},
		{
			id: 'proj-002',
			title: 'Regional Education Impact Study',
			abbreviation: 'REIS24',
			description: 'Study focusing on educational outcomes in northern states',
			status: 'ACTIVE',
			geographicScope: 'REGIONAL',
			organizationId: 'org-001',
			createdBy: 'admin-002',
			createdAt: '2025-01-10T09:15:00Z',
			updatedAt: '2025-01-18T16:45:00Z'
		},
		{
			id: 'proj-003',
			title: 'Pilot Digital Skills Training',
			abbreviation: 'PDST',
			description: 'Digital literacy program for rural communities',
			status: 'INACTIVE',
			geographicScope: 'REGIONAL',
			organizationId: 'org-001',
			createdBy: 'admin-001',
			createdAt: '2024-12-01T11:30:00Z',
			updatedAt: '2025-01-05T10:20:00Z'
		}
	];

	let mockUserAssignments: UserAssignment[] = [
		{
			id: 'ua-001',
			projectId: 'proj-001',
			userId: 'user-001',
			assignedBy: 'admin-001',
			roleInProject: 'Project Manager',
			assignedAt: '2025-01-15T10:00:00Z',
			isActive: true,
			assignedUntil: '2025-12-31T23:59:59Z'
		},
		{
			id: 'ua-002',
			projectId: 'proj-001',
			userId: 'user-002',
			assignedBy: 'admin-001',
			roleInProject: 'Data Analyst',
			assignedAt: '2025-01-16T09:00:00Z',
			isActive: true
		},
		{
			id: 'ua-003',
			projectId: 'proj-001',
			userId: 'user-003',
			assignedBy: 'admin-002',
			roleInProject: 'Field Coordinator',
			assignedAt: '2025-01-14T14:00:00Z',
			isActive: false,
			assignedUntil: '2025-01-31T23:59:59Z'
		}
	];

	let selectedProject: Project | null = null;
	let showEditForm = false;
	let showCreateForm = false;

	function handleProjectClick(event: CustomEvent) {
		selectedProject = event.detail.project;
	}

	function handleEditProject(event: CustomEvent) {
		selectedProject = event.detail.project;
		showEditForm = true;
		showCreateForm = false;
	}

	function handleCreateProject() {
		selectedProject = null;
		showCreateForm = true;
		showEditForm = false;
	}

	function handleFormSubmit(event: CustomEvent) {
		const { data, isEdit } = event.detail;
		console.log('Form submitted:', { data, isEdit });
		// Handle form submission
		showEditForm = false;
		showCreateForm = false;
	}

	function handleFormCancel() {
		showEditForm = false;
		showCreateForm = false;
	}

	function handleAddUser(event: CustomEvent) {
		console.log('Add user:', event.detail);
		// Handle adding user
	}

	function handleRemoveUser(event: CustomEvent) {
		console.log('Remove user:', event.detail);
		// Handle removing user
	}
</script>

<svelte:head>
	<title>Project Components Showcase - SurveyLauncher</title>
</svelte:head>

<div class="container mx-auto py-8 space-y-8">
	<div class="text-center space-y-2">
		<h1 class="text-3xl font-bold">Project Management Components</h1>
		<p class="text-muted-foreground">Showcase of all Project Management UI components</p>
	</div>

	<!-- Project Form (Create Mode) -->
	{#if showCreateForm}
		<div class="mb-8">
			<h2 class="text-2xl font-semibold mb-4">Create New Project Form</h2>
			<ProjectForm
				project={null}
				onsubmit={handleFormSubmit}
				oncancel={handleFormCancel}
			/>
		</div>
	{:else}
		<div class="mb-8">
			<Button on:click={handleCreateProject}>Create New Project</Button>
		</div>
	{/if}

	<!-- Project Form (Edit Mode) -->
	{#if showEditForm && selectedProject}
		<div class="mb-8">
			<h2 class="text-2xl font-semibold mb-4">Edit Project Form</h2>
			<ProjectForm
				project={selectedProject}
				onsubmit={handleFormSubmit}
				oncancel={handleFormCancel}
			/>
		</div>
	{/if}

	<!-- Project Table -->
	<div class="mb-8">
		<h2 class="text-2xl font-semibold mb-4">Project Table</h2>
		<ProjectTable
			projects={mockProjects}
			onprojectClick={handleProjectClick}
			oneditProject={handleEditProject}
		/>
	</div>

	<!-- Project Cards Grid -->
	<div class="mb-8">
		<h2 class="text-2xl font-semibold mb-4">Project Cards</h2>
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each mockProjects as project}
				<ProjectCard
					project={project}
					onclick={handleProjectClick}
					onedit={handleEditProject}
					onmanageUsers={(e) => console.log('Manage users for:', e.detail.project)}
					onmanageTeams={(e) => console.log('Manage teams for:', e.detail.project)}
					ondelete={(e) => console.log('Delete project:', e.detail.project)}
				/>
			{/each}
		</div>
	</div>

	<!-- User Assignment Component -->
	{#if selectedProject}
		<div class="mb-8">
			<h2 class="text-2xl font-semibold mb-4">
				User Assignments for {selectedProject.title}
			</h2>
			<UserAssignmentComponent
				assignments={mockUserAssignments}
				projectId={selectedProject.id}
				onaddUser={handleAddUser}
				onremoveUser={handleRemoveUser}
			/>
		</div>
	{/if}

	<!-- Project Actions Component -->
	{#if selectedProject}
		<div class="mb-8">
			<h2 class="text-2xl font-semibold mb-4">
				Project Actions for {selectedProject.title}
			</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<ProjectActions
					project={selectedProject}
					onviewDetails={(e) => console.log('View details:', e.detail.project)}
					onedit={handleEditProject}
					onmanageUsers={(e) => console.log('Manage users:', e.detail.project)}
					onmanageTeams={(e) => console.log('Manage teams:', e.detail.project)}
					ondelete={(e) => console.log('Delete project:', e.detail.project)}
				/>
				<ProjectActions
					project={selectedProject}
					size="small"
					onviewDetails={(e) => console.log('View details:', e.detail.project)}
					onedit={handleEditProject}
					onmanageUsers={(e) => console.log('Manage users:', e.detail.project)}
					onmanageTeams={(e) => console.log('Manage teams:', e.detail.project)}
					ondelete={(e) => console.log('Delete project:', e.detail.project)}
				/>
			</div>
		</div>
	{/if}

	<!-- Selected Project Details -->
	{#if selectedProject}
		<div class="mt-8 p-4 bg-muted/50 rounded-lg">
			<h3 class="font-semibold mb-2">Selected Project:</h3>
			<pre class="text-sm text-muted-foreground">{JSON.stringify(selectedProject, null, 2)}</pre>
		</div>
	{/if}
</div>