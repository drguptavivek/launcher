<!-- Dashboard page for SurveyLauncher Admin -->
<script lang="ts">
  import { API_BASE_URL } from '$lib/api';
  import { authUtils } from '$lib/utils/auth.utils';
  import { getProjects, getTotalUsersCount, getActiveUsersCount, getTotalDevicesCount, getActiveDevicesCount } from '$lib/api/remote';
  import { Button } from '$lib/components/ui/button';

  // Dashboard state
  let user = $state(null);
  let isLoading = $state(true);
  let error = $state('');
  let projects = $state([]);
  let projectsLoading = $state(true);
  let projectsError = $state('');

  // User and device statistics
  let totalUsers = $state(0);
  let activeUsers = $state(0);
  let totalDevices = $state(0);
  let activeDevices = $state(0);
  let statsLoading = $state(true);
  let statsError = $state('');

  // Check authentication on page load
  async function checkAuth() {
    try {
      const accessToken = authUtils.getAccessToken();
      if (!accessToken) {
        window.location.href = '/auth/login';
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/auth/whoami`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        user = data.user;
      } else {
        // Token might be expired, clear and redirect to login
        authUtils.clearAuthTokens();
        window.location.href = '/auth/login';
      }
    } catch (err) {
      error = `Failed to load user data: ${err.message}`;
    } finally {
      isLoading = false;
    }
  }

  // Logout function
  async function handleLogout() {
    try {
      const accessToken = authUtils.getAccessToken();
      if (accessToken) {
        await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
      }
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      authUtils.clearAuthTokens();
      window.location.href = '/auth/login';
    }
  }

  // Load projects data
  async function loadProjects() {
    projectsLoading = true;
    projectsError = '';
    try {
      const response = await getProjects();
      projects = response.projects || [];
    } catch (err: any) {
      projectsError = err.message || 'Failed to load projects';
      console.error('Load projects error:', err);
    } finally {
      projectsLoading = false;
    }
  }

  // Load statistics data
  async function loadStatistics() {
    statsLoading = true;
    statsError = '';
    try {
      // Load all statistics in parallel
      const [totalUsersCount, activeUsersCount, totalDevicesCount, activeDevicesCount] = await Promise.all([
        getTotalUsersCount(),
        getActiveUsersCount(),
        getTotalDevicesCount(),
        getActiveDevicesCount()
      ]);

      totalUsers = totalUsersCount;
      activeUsers = activeUsersCount;
      totalDevices = totalDevicesCount;
      activeDevices = activeDevicesCount;
    } catch (err: any) {
      statsError = err.message || 'Failed to load statistics';
      console.error('Load statistics error:', err);
    } finally {
      statsLoading = false;
    }
  }

  // Navigate to project
  function navigateToProject(projectId: string) {
    window.location.href = `/projects/${projectId}`;
  }

  // Load data on component mount
  $effect(() => {
    checkAuth();
    loadProjects();
    loadStatistics();
  });

  // Calculate real project statistics
  let projectStats = $derived(() => {
    if (!projects.length) {
      return {
        totalProjects: 0,
        activeProjects: 0,
        inactiveProjects: 0,
        nationalProjects: 0,
        regionalProjects: 0
      };
    }

    return {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === 'ACTIVE').length,
      inactiveProjects: projects.filter(p => p.status === 'INACTIVE').length,
      nationalProjects: projects.filter(p => p.geographicScope === 'NATIONAL').length,
      regionalProjects: projects.filter(p => p.geographicScope === 'REGIONAL').length
    };
  });

  // Real statistics from backend APIs
  let stats = $derived(() => ({
    totalUsers: statsLoading ? '...' : totalUsers,
    activeDevices: statsLoading ? '...' : activeDevices,
    totalSurveys: '...', // TODO: Implement when survey API is available
    activeSessions: '...'  // TODO: Implement when session API is available
  }));

  const recentActivity = [
    { id: 1, type: 'login', user: 'user001', device: 'dev-mock-001', time: '2 mins ago' },
    { id: 2, type: 'survey', user: 'user002', device: 'dev-mock-002', time: '5 mins ago' },
    { id: 3, type: 'logout', user: 'user003', device: 'dev-mock-003', time: '12 mins ago' },
    { id: 4, type: 'login', user: 'user004', device: 'dev-mock-004', time: '18 mins ago' }
  ];
</script>

<svelte:head>
  <title>Dashboard - SurveyLauncher Admin</title>
  <meta name="description" content="SurveyLauncher Admin Dashboard" />
</svelte:head>

<div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
  <!-- Dashboard Header -->
  <div class="px-4 py-6 sm:px-0">
    <div class="flex justify-between items-center mb-8">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">SurveyLauncher Admin Panel</p>
        {#if user}
          <p class="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Welcome, <span class="font-medium">{user.name || user.code || 'Admin'}</span>
          </p>
        {/if}
      </div>
    </div>
  </div>
    <!-- Loading State -->
    {#if isLoading}
      <div class="text-center py-12">
        <div class="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-white bg-blue-500">
          <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading dashboard...
        </div>
      </div>
    {:else if error}
      <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
        {error}
      </div>
    {:else}
      <!-- Dashboard Content -->
      <div class="px-4 py-6 sm:px-0">
        <!-- Stats Grid -->
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <!-- Total Projects -->
          <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Projects</dt>
                    <dd class="text-lg font-medium text-gray-900 dark:text-white">
                      {projectsLoading ? '...' : projectStats.totalProjects}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <!-- Active Projects -->
          <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg class="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Active Projects</dt>
                    <dd class="text-lg font-medium text-gray-900 dark:text-white">
                      {projectsLoading ? '...' : projectStats.activeProjects}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <!-- Total Users -->
          <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Users</dt>
                    <dd class="text-lg font-medium text-gray-900 dark:text-white">{stats.totalUsers}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <!-- Active Devices -->
          <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Active Devices</dt>
                    <dd class="text-lg font-medium text-gray-900 dark:text-white">{stats.activeDevices}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <!-- Total Surveys -->
          <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Total Surveys</dt>
                    <dd class="text-lg font-medium text-gray-900 dark:text-white">{stats.totalSurveys}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <!-- Active Sessions -->
          <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div class="p-5">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div class="ml-5 w-0 flex-1">
                  <dl>
                    <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Active Sessions</dt>
                    <dd class="text-lg font-medium text-gray-900 dark:text-white">{stats.activeSessions}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg mb-8">
          <div class="px-4 py-5 sm:p-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">Quick Actions</h3>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <a href="/projects" class="inline-flex items-center px-4 py-3 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <svg class="h-5 w-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Manage Projects
              </a>

              <a href="/users" class="inline-flex items-center px-4 py-3 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <svg class="h-5 w-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                Manage Users
              </a>

              <a href="/devices" class="inline-flex items-center px-4 py-3 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <svg class="h-5 w-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Device Management
              </a>

              <a href="/test" class="inline-flex items-center px-4 py-3 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <svg class="h-5 w-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Test Implementation
              </a>
            </div>
          </div>
        </div>

        <!-- Projects Overview -->
        <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg mb-8">
          <div class="px-4 py-5 sm:p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">Recent Projects</h3>
              <a href="/projects" class="text-sm font-medium text-blue-600 hover:text-blue-500">View all</a>
            </div>

            {#if projectsLoading}
              <div class="text-center py-6">
                <div class="text-sm text-gray-500">Loading projects...</div>
              </div>
            {:else if projectsError}
              <div class="text-center py-6">
                <div class="text-sm text-red-500">Error loading projects: {projectsError}</div>
                <Button variant="outline" size="sm" onclick={loadProjects} class="mt-2">Retry</Button>
              </div>
            {:else if projects.length === 0}
              <div class="text-center py-6">
                <div class="text-sm text-gray-500 mb-4">No projects found</div>
                <a href="/projects/create">
                  <Button size="sm">Create your first project</Button>
                </a>
              </div>
            {:else}
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {#each projects.slice(0, 6) as project}
                  <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer" onclick={() => navigateToProject(project.id)}>
                    <div class="flex items-center justify-between mb-2">
                      <h4 class="text-sm font-medium text-gray-900 dark:text-white truncate">{project.title}</h4>
                      <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {project.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                        {project.status}
                      </span>
                    </div>
                    <p class="text-sm text-gray-500 dark:text-gray-400 truncate mb-2">{project.abbreviation}</p>
                    <div class="flex items-center justify-between text-xs text-gray-400">
                      <span>{project.geographicScope}</span>
                      <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">Recent Activity</h3>
            <div class="flow-root">
              <ul class="-mb-8">
                {#each recentActivity as activity, index}
                  <li>
                    <div class="relative pb-8">
                      {#if index !== recentActivity.length - 1}
                        <span class="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-600" aria-hidden="true"></span>
                      {/if}
                      <div class="relative flex space-x-3">
                        <div>
                          <span class="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white dark:ring-gray-800">
                            {#if activity.type === 'login'}
                              <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                              </svg>
                            {:else if activity.type === 'logout'}
                              <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                              </svg>
                            {:else if activity.type === 'survey'}
                              <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                            {/if}
                          </span>
                        </div>
                        <div class="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p class="text-sm text-gray-500 dark:text-gray-400">
                              {activity.user} {activity.type} on {activity.device}
                            </p>
                          </div>
                          <div class="text-right text-sm whitespace-nowrap text-gray-500 dark:text-gray-400">
                            <time>{activity.time}</time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                {/each}
              </ul>
            </div>
          </div>
        </div>
      </div>
    {/if}
</div>