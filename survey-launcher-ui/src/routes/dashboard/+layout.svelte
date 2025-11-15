<!-- Dashboard Section Layout -->
<script lang="ts">
  import { roleStore, createRoleStore } from '$lib/stores/role.svelte.js';
  import { redirect } from '@sveltejs/kit';

  let { children } = $props();

  // Initialize role store
  let roleState = createRoleStore();

  // Check permissions for dashboard section
  $effect(() => {
    if (!roleState.hasPermission('dashboard:read')) {
      throw redirect(302, '/auth/login');
    }
  });

  // Dashboard section navigation
  const dashboardNavigation = [
    { href: '/dashboard', label: 'Overview', icon: 'layout-dashboard' },
    { href: '/dashboard/analytics', label: 'Analytics', icon: 'chart-bar', requiredPermission: 'analytics:read' },
    { href: '/dashboard/monitoring', label: 'Monitoring', icon: 'activity', requiredPermission: 'monitoring:read' },
    { href: '/dashboard/reports', label: 'Reports', icon: 'document-text', requiredPermission: 'reports:read' },
  ];

  function getDashboardNavIcon(iconName: string) {
    const icons: Record<string, string> = {
      'layout-dashboard': 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      'chart-bar': 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      'activity': 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      'document-text': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    };
    return icons[iconName] || 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
  }
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
  <!-- Dashboard Section Header -->
  <div class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="h-8 w-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div>
              <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
              <p class="text-sm text-gray-600 dark:text-gray-400">System overview and analytics</p>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="flex items-center space-x-3">
            <div class="text-sm text-gray-600 dark:text-gray-400">
              {roleState.getRoleDisplayName()}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Section Navigation -->
  <div class="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <nav class="flex space-x-8" aria-label="Dashboard navigation">
        {#each dashboardNavigation as item}
          {#if !item.requiredPermission || roleState.hasPermission(item.requiredPermission)}
            <a
              href={item.href}
              class="group flex items-center px-1 py-4 border-b-2 font-medium text-sm
                     {item.href === window.location.pathname
                       ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                       : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}"
            >
              <svg class="w-5 h-5 mr-2 text-gray-400 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getDashboardNavIcon(item.icon)} />
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