<!-- Navigation Bar Component -->
<script>
  import { authUtils } from '$lib/utils/auth.utils';

  // Check if user is authenticated
  let isAuthenticated = $state(authUtils.isAuthenticated());
  let isMenuOpen = $state(false);

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
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      authUtils.clearAuthTokens();
      window.location.href = '/auth/login';
    }
  }

  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
  }

  // Update auth state when component mounts
  $effect(() => {
    isAuthenticated = authUtils.isAuthenticated();
  });
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
              <a href="/dashboard" class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                Dashboard
              </a>
              <a href="/users" class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                Users
              </a>
              <a href="/devices" class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                Devices
              </a>
              <a href="/test" class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                Test
              </a>
            {/if}
          </div>
        </div>
      </div>

      <!-- Right side buttons -->
      <div class="hidden md:flex items-center space-x-4">
        {#if isAuthenticated}
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
          <a href="/dashboard" class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700">
            Dashboard
          </a>
          <a href="/users" class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700">
            Users
          </a>
          <a href="/devices" class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700">
            Devices
          </a>
          <a href="/test" class="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-100 dark:hover:bg-gray-700">
            Test
          </a>
        {/if}
      </div>
      <div class="pt-4 pb-3 border-t border-gray-200 dark:border-gray-700">
        <div class="px-2 space-y-1">
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