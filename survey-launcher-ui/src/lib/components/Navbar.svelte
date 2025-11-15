<!-- Navigation Bar Component -->
<script lang="ts">
  import { authUtils } from '$lib/utils/auth.utils';
  import { getRoleContext, createRoleStore } from '$lib/stores/role.svelte.js';
  import { getNavigationForRole, getRoleDisplayName } from '$lib/utils/role.utils';

  // Check if user is authenticated
  let isAuthenticated = $state(authUtils.isAuthenticated());
  let isMenuOpen = $state(false);

  // Role management
  let roleStore = createRoleStore();
  let navigationItems = $state<Array<{href: string, label: string, icon: string}>>([]);
  let roleDisplayName = $state('');

  // Update auth state and load user info when component mounts
  $effect(() => {
    isAuthenticated = authUtils.isAuthenticated();

    if (isAuthenticated) {
      // Load user info asynchronously
      loadUserInfo();
    } else {
      roleStore.clear();
      navigationItems = [];
      roleDisplayName = '';
    }
  });

  // Separate async function for loading user info
  async function loadUserInfo() {
    try {
      const accessToken = authUtils.getAccessToken();
      if (accessToken) {
        // Get current user information
        const response = await fetch(`${import.meta.env.PUBLIC_SURVEY_LAUNCHER_API_URL}/api/v1/auth/whoami`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });

        if (response.ok) {
          const userData = await response.json();
          roleStore.setUser(userData.user);
          roleStore.setSession(userData.session);
          navigationItems = getNavigationForRole(userData.user.role);
          roleDisplayName = getRoleDisplayName(userData.user.role);
        }
      }
    } catch (err) {
      console.error('Failed to load user role:', err);
    }
  }

  // Logout function
  async function handleLogout() {
    try {
      const accessToken = authUtils.getAccessToken();
      if (accessToken) {
        await fetch(`${import.meta.env.PUBLIC_SURVEY_LAUNCHER_API_URL}/api/v1/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
      }
    } catch (err: any) {
      console.error('Logout error:', err);
    } finally {
      authUtils.clearAuthTokens();
      roleStore.clear();
      window.location.href = '/auth/login';
    }
  }

  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
  }

  // Helper function to render navigation icons
  function getNavIcon(iconName: string) {
    const icons: Record<string, string> = {
      'layout-dashboard': 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      'users': 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z',
      'folder': 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
      'smartphone': 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
      'shield': 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      'clipboard-list': 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      'help-circle': 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      'globe': 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9',
      'check-square': 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
    };
    return icons[iconName] || 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
  }
</script>

<!-- Skip to main content link (visually hidden until focused) -->
<a href="#main-content" class="skip-link">Skip to main content</a>

<!-- Navigation Bar -->
<nav class="bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center h-16">
      <!-- Logo and main navigation -->
      <div class="flex items-center">
        <!-- Logo -->
        <div class="flex-shrink-0">
          <a href="/" class="flex items-center">
            <div class="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
              <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span class="text-xl font-bold text-gray-900 dark:text-white">SurveyLauncher</span>
          </a>
        </div>

        <!-- Desktop navigation -->
        <div class="hidden md:block ml-10">
          <div class="flex items-baseline space-x-4">
            <a href="/" class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              Home
            </a>
            {#if isAuthenticated}
              <!-- Role-based navigation items -->
              {#each navigationItems as item}
                <a
                  href={item.href}
                  class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getNavIcon(item.icon)} />
                  </svg>
                  <span>{item.label}</span>
                </a>
              {/each}
              <!-- Development test links -->
              <a href="/test" class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                Test
              </a>
              <a href="/role-test" class="text-purple-600 dark:text-purple-300 hover:text-purple-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-purple-100 dark:hover:bg-purple-700 transition-colors">
                Role Test
              </a>
            {/if}
          </div>
        </div>
      </div>

      <!-- Right side buttons -->
      <div class="hidden md:flex items-center space-x-4">
        {#if isAuthenticated}
          <!-- Role information display -->
          {#if roleDisplayName}
            <div class="flex items-center space-x-2">
              <span class="text-sm text-gray-600 dark:text-gray-300">Role:</span>
              <span class="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-md text-xs font-medium">
                {roleDisplayName}
              </span>
            </div>
          {/if}
          <button
            onclick={handleLogout}
            class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Logout
          </button>
        {:else}
          <a
            href="/auth/login"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Login
          </a>
        {/if}
      </div>

      <!-- Mobile menu button -->
      <div class="md:hidden">
        <button
          onclick={toggleMenu}
          class="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
          aria-expanded="false"
        >
          <span class="sr-only">Open main menu</span>
          <!-- Menu icon -->
          {#if !isMenuOpen}
            <svg class="block h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          {:else}
            <!-- Close icon -->
            <svg class="block h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Mobile menu panel -->
  {#if isMenuOpen}
    <div class="md:hidden">
      <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3">
        <a href="/" class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700">
          Home
        </a>
        {#if isAuthenticated}
          <!-- Role-based navigation items for mobile -->
          {#each navigationItems as item}
            <a
              href={item.href}
              class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getNavIcon(item.icon)} />
              </svg>
              <span>{item.label}</span>
            </a>
          {/each}
          <!-- Development test links -->
          <a href="/test" class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700">
            Test
          </a>
          <a href="/role-test" class="text-purple-600 dark:text-purple-300 hover:text-purple-900 dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium hover:bg-purple-100 dark:hover:bg-purple-700">
            Role Test
          </a>
        {/if}
      </div>
      <div class="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700">
        <!-- Role information in mobile menu -->
        {#if isAuthenticated && roleDisplayName}
          <div class="px-3 py-2">
            <div class="flex items-center space-x-2">
              <span class="text-sm text-gray-600 dark:text-gray-300">Role:</span>
              <span class="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-md text-xs font-medium">
                {roleDisplayName}
              </span>
            </div>
          </div>
        {/if}
        <div class="px-2 space-y-1 pt-2">
          {#if isAuthenticated}
            <button
              onclick={handleLogout}
              class="w-full text-left bg-red-600 hover:bg-red-700 text-white block px-3 py-2 rounded-md text-base font-medium transition-colors"
            >
              Logout
            </button>
          {:else}
            <a
              href="/auth/login"
              class="bg-blue-600 hover:bg-blue-700 text-white block px-3 py-2 rounded-md text-base font-medium transition-colors"
            >
              Login
            </a>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</nav>

<style>
  /* Skip link styles - hidden until focused */
  .skip-link {
    position: absolute;
    top: -40px;
    left: 6px;
    background: #000;
    color: white;
    padding: 8px;
    text-decoration: none;
    z-index: 100;
    border-radius: 4px;
  }

  .skip-link:focus {
    top: 6px;
  }
</style>