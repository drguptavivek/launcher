<!-- Projects Section Layout -->
<script lang="ts">
  import { roleStore, createRoleStore } from '$lib/stores/role.svelte.js';
  import { redirect } from '@sveltejs/kit';

  let { children } = $props();

  // Initialize role store
  let roleState = createRoleStore();

  // Check permissions for projects section
  $effect(() => {
    if (!roleState.hasPermission('projects:read')) {
      throw redirect(302, '/dashboard');
    }
  });

  // Projects section navigation
  const projectsNavigation = [
    { href: '/projects', label: 'All Projects', icon: 'folder' },
    { href: '/projects/create', label: 'Create Project', icon: 'folder-plus', requiredPermission: 'projects:create' },
  ];

  function getProjectsNavIcon(iconName: string) {
    const icons: Record<string, string> = {
      'folder': 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
      'folder-plus': 'M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    };
    return icons[iconName] || 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
  }
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
  <!-- Projects Section Header -->
  <div class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="h-8 w-8 bg-green-600 rounded-lg flex items-center justify-center">
              <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Project Management</h1>
              <p class="text-sm text-gray-600 dark:text-gray-400">Manage projects and assignments</p>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="flex items-center space-x-3">
            {#if roleState.hasPermission('projects:create')}
              <a href="/projects/create" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                Create Project
              </a>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Section Navigation -->
  <div class="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <nav class="flex space-x-8" aria-label="Projects navigation">
        {#each projectsNavigation as item}
          {#if !item.requiredPermission || roleState.hasPermission(item.requiredPermission)}
            <a
              href={item.href}
              class="group flex items-center px-1 py-4 border-b-2 font-medium text-sm
                     {item.href === window.location.pathname
                       ? 'border-green-500 text-green-600 dark:text-green-400'
                       : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}"
            >
              <svg class="w-5 h-5 mr-2 text-gray-400 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getProjectsNavIcon(item.icon)} />
              </svg>
              {item.label}
            </a>
          {/if}
        {/each}
      </nav>
    </div>
  </div>

  <!-- Main content area -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {@render children()}
  </main>
</div>