<!-- Project Details Page -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { getProjects } from '$lib/api/remote';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { ProjectActions, UserAssignment } from '$lib/components/projects';
  import type { Project } from '$lib/api/remote';

  // Get the project ID from URL parameters
  let { params } = $props();
  let projectId = $state(params.id);
  let project = $state<Project | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let activeTab = $state<'details' | 'users' | 'teams'>('details');

  // Load project data
  $effect(() => {
    if (projectId) {
      loadProject();
    }
  });

  async function loadProject() {
    loading = true;
    error = null;
    try {
      const response = await getProjects();
      // Find the project with matching ID from the projects array
      project = response.devices?.find((p: any) => p.id === projectId) || null;
      if (!project) {
        error = 'Project not found';
      }
    } catch (err: any) {
      error = err.message || 'Failed to load project';
      console.error('Load project error:', err);
    } finally {
      loading = false;
    }
  }

  function handleEdit() {
    // TODO: Navigate to edit project page
    console.log('Edit project:', project);
  }

  function handleDelete() {
    if (project && confirm(`Are you sure you want to delete "${project.title}"?`)) {
      // TODO: Implement delete functionality
      console.log('Delete project:', project);
      // Navigate back to projects list
      window.location.href = '/projects';
    }
  }

  function handleManageUsers() {
    activeTab = 'users';
  }

  function handleManageTeams() {
    activeTab = 'teams';
  }

  function handleAddUser(assignmentData: any) {
    // TODO: Implement add user functionality
    console.log('Add user:', assignmentData);
    // Reload users list
    loadProject();
  }

  function handleRemoveUser(assignment: any) {
    if (confirm('Are you sure you want to remove this user assignment?')) {
      // TODO: Implement remove user functionality
      console.log('Remove user:', assignment);
      // Reload users list
      loadProject();
    }
  }

  function getProjectStatusColor(status: string) {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }
</script>

{#if loading}
  <div class="container mx-auto px-4 py-6 max-w-7xl">
    <div class="flex items-center justify-center py-12">
      <div class="text-lg text-gray-600 dark:text-gray-400">Loading project...</div>
    </div>
  </div>
{:else if error}
  <div class="container mx-auto px-4 py-6 max-w-7xl">
    <div class="flex items-center justify-center py-12">
      <div class="text-center">
        <div class="text-red-600 mb-4">Error: {error}</div>
        <Button variant="outline" onclick={() => window.history.back()}>Go Back</Button>
      </div>
    </div>
  </div>
{:else if !project}
  <div class="container mx-auto px-4 py-6 max-w-7xl">
    <div class="flex items-center justify-center py-12">
      <div class="text-center">
        <div class="text-gray-500 mb-4">Project not found</div>
        <Button variant="outline" onclick={() => window.location.href = '/projects'}>
          Back to Projects
        </Button>
      </div>
    </div>
  </div>
{:else}
  <div class="container mx-auto px-4 py-6 max-w-7xl">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <Button variant="outline" onclick={() => window.location.href = '/projects'}>
            ← Back to Projects
          </Button>
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">{project.title}</h1>
            <div class="flex items-center gap-3 mt-2">
              <Badge class={getProjectStatusColor(project.status)}>
                {project.status}
              </Badge>
              <span class="text-gray-600 dark:text-gray-400">
                {project.abbreviation}
              </span>
            </div>
          </div>
        </div>
        <ProjectActions
          project={project}
          size="normal"
          on:edit={() => handleEdit()}
          on:delete={() => handleDelete()}
          on:manageUsers={() => handleManageUsers()}
          on:manageTeams={() => handleManageTeams()}
        />
      </div>
    </div>

    <!-- Tabs -->
    <div class="mb-6">
      <div class="border-b border-gray-200 dark:border-gray-700">
        <nav class="-mb-px flex space-x-8">
          <button
            class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'details' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
            onclick={() => activeTab = 'details'}
          >
            Project Details
          </button>
          <button
            class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'users' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
            onclick={() => activeTab = 'users'}
          >
            User Assignments
          </button>
          <button
            class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'teams' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
            onclick={() => activeTab = 'teams'}
          >
            Team Assignments
          </button>
        </nav>
      </div>
    </div>

    <!-- Tab Content -->
    {#if activeTab === 'details'}
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Main Information -->
        <div class="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Description</dt>
                  <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                    {project.description || 'No description provided'}
                  </dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Geographic Scope</dt>
                  <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                    {project.geographicScope}
                  </dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
                  <dd class="mt-1">
                    <Badge class={getProjectStatusColor(project.status)}>
                      {project.status}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Abbreviation</dt>
                  <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                    {project.abbreviation}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <!-- Metadata -->
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Created</dt>
                  <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                    {formatDate(project.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</dt>
                  <dd class="mt-1 text-sm text-gray-900 dark:text-white">
                    {formatDate(project.updatedAt)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        <!-- Quick Actions -->
        <div class="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent class="space-y-3">
              <Button variant="outline" class="w-full justify-start" onclick={handleManageUsers}>
                Manage Users
              </Button>
              <Button variant="outline" class="w-full justify-start" onclick={handleManageTeams}>
                Manage Teams
              </Button>
              <Button variant="outline" class="w-full justify-start" onclick={handleEdit}>
                Edit Project
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-600 dark:text-gray-400">Current Status</span>
                  <Badge class={getProjectStatusColor(project.status)}>
                    {project.status}
                  </Badge>
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">
                  Last updated: {formatDate(project.updatedAt)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    {:else if activeTab === 'users'}
      <UserAssignment
        projectId={projectId}
        loading={false}
        error={null}
        onaddUser={handleAddUser}
        onremoveUser={handleRemoveUser}
      />
    {:else if activeTab === 'teams'}
      <Card>
        <CardContent class="py-12">
          <div class="text-center">
            <div class="text-gray-500 mb-4">Team assignments coming soon</div>
            <p class="text-gray-400 text-sm">This feature will be implemented in Phase 4</p>
          </div>
        </CardContent>
      </Card>
    {/if}
  </div>
{/if}

<style>
  .container {
    min-height: calc(100vh - 4rem);
  }
</style>