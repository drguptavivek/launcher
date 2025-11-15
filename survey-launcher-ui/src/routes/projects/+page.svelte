<!-- Projects Management Page -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { getProjects } from '$lib/api/remote';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { ProjectTable, ProjectCard, ProjectForm } from '$lib/components/projects';
  import type { Project } from '$lib/api/remote';

  // Page state
  let projects = $state<Project[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let showCreateForm = $state(false);
  let viewMode = $state<'table' | 'card'>('table');
  let selectedProject = $state<Project | null>(null);

  // Load projects on mount
  $effect(async () => {
    await loadProjects();
  });

  async function loadProjects() {
    loading = true;
    error = null;
    try {
      const response = await getProjects();
      projects = response.projects || [];
    } catch (err: any) {
      error = err.message || 'Failed to load projects';
      console.error('Load projects error:', err);
    } finally {
      loading = false;
    }
  }

  function handleCreateProject() {
    selectedProject = null;
    showCreateForm = true;
  }

  function handleEditProject(project: Project) {
    selectedProject = project;
    showCreateForm = true;
  }

  function handleDeleteProject(project: Project) {
    if (confirm(`Are you sure you want to delete "${project.title}"?`)) {
      // TODO: Implement delete functionality
      console.log('Delete project:', project);
    }
  }

  function handleProjectClick(project: Project) {
    // Navigate to project details
    window.location.href = `/projects/${project.id}`;
  }

  function handleFormSubmit(data: any) {
    // TODO: Implement create/update functionality
    console.log('Form submitted:', data);
    showCreateForm = false;
    loadProjects(); // Reload the list
  }

  function handleFormCancel() {
    showCreateForm = false;
    selectedProject = null;
  }
</script>

<div class="container mx-auto px-4 py-6 max-w-7xl">
  <!-- Header -->
  <div class="mb-8">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Projects</h1>
        <p class="text-gray-600 dark:text-gray-400 mt-2">
          Manage and monitor your survey projects
        </p>
      </div>
      <Button onclick={handleCreateProject} class="flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Create New Project
      </Button>
    </div>
  </div>

  <!-- View Mode Toggle -->
  <div class="mb-6 flex items-center gap-4">
    <div class="flex items-center gap-2">
      <Button
        variant={viewMode === 'table' ? 'default' : 'outline'}
        size="sm"
        onclick={() => viewMode = 'table'}
      >
        Table View
      </Button>
      <Button
        variant={viewMode === 'card' ? 'default' : 'outline'}
        size="sm"
        onclick={() => viewMode = 'card'}
      >
        Card View
      </Button>
    </div>
    <div class="text-sm text-gray-600 dark:text-gray-400">
      {projects.length} project{projects.length !== 1 ? 's' : ''}
    </div>
  </div>

  <!-- Projects List -->
  {#if showCreateForm}
    <div class="mb-8">
      <ProjectForm
        project={selectedProject}
        loading={false}
        error={null}
        onsubmit={handleFormSubmit}
        oncancel={handleFormCancel}
      />
    </div>
  {:else if loading}
    <Card>
      <CardContent class="py-12">
        <div class="flex items-center justify-center">
          <div class="text-lg text-gray-600 dark:text-gray-400">Loading projects...</div>
        </div>
      </CardContent>
    </Card>
  {:else if error}
    <Card>
      <CardContent class="py-12">
        <div class="text-center">
          <div class="text-red-600 mb-4">Error: {error}</div>
          <Button variant="outline" onclick={loadProjects}>Try Again</Button>
        </div>
      </CardContent>
    </Card>
  {:else if projects.length === 0}
    <Card>
      <CardContent class="py-12">
        <div class="text-center">
          <div class="text-gray-500 mb-4">No projects found</div>
          <p class="text-gray-400 mb-6">Create your first project to get started</p>
          <Button onclick={handleCreateProject}>Create First Project</Button>
        </div>
      </CardContent>
    </Card>
  {:else}
    {#if viewMode === 'table'}
      <ProjectTable
        projects={projects}
        loading={loading}
        error={error}
        oneditProject={handleEditProject}
        ondeleteProject={handleDeleteProject}
        onprojectClick={handleProjectClick}
      />
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each projects as project (project.id)}
          <ProjectCard
            project={project}
            onedit={(e) => {
              e.stopPropagation();
              handleEditProject(project);
            }}
            ondelete={(e) => {
              e.stopPropagation();
              handleDeleteProject(project);
            }}
            onclick={() => handleProjectClick(project)}
          />
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .container {
    min-height: calc(100vh - 4rem);
  }
</style>