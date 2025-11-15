<!-- Users Section Layout -->
<script lang="ts">
  import { roleStore, createRoleStore } from '$lib/stores/role.svelte.js';
  import { redirect } from '@sveltejs/kit';

  let { children } = $props();

  // Initialize role store
  let roleState = createRoleStore();

  // Check permissions for users section
  $effect(() => {
    if (!roleState.hasPermission('users:read')) {
      throw redirect(302, '/dashboard');
    }
  });

  // Users section navigation
  const usersNavigation = [
    { href: '/users', label: 'All Users', icon: 'users' },
    { href: '/users/create', label: 'Create User', icon: 'user-plus', requiredPermission: 'users:create' },
  ];

  function getUsersNavIcon(iconName: string) {
    const icons: Record<string, string> = {
      'users': 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z',
      'user-plus': 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z'
    };
    return icons[iconName] || 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
  }
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
  <!-- Users Section Header -->
  <div class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
              <p class="text-sm text-gray-600 dark:text-gray-400">Manage system users and permissions</p>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="flex items-center space-x-3">
            {#if roleState.hasPermission('users:create')}
              <a href="/users/create" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                Create User
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
      <nav class="flex space-x-8" aria-label="Users navigation">
        {#each usersNavigation as item}
          {#if !item.requiredPermission || roleState.hasPermission(item.requiredPermission)}
            <a
              href={item.href}
              class="group flex items-center px-1 py-4 border-b-2 font-medium text-sm
                     {item.href === window.location.pathname
                       ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                       : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}"
            >
              <svg class="w-5 h-5 mr-2 text-gray-400 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getUsersNavIcon(item.icon)} />
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