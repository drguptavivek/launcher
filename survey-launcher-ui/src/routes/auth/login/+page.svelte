<!-- Login page for SurveyLauncher Admin -->
<script lang="ts">
  import { webAdminLogin } from '$lib/api/remote';
import { API_BASE_URL } from '$lib/api/client';

  // Form state for Web Admin authentication
  let formData = $state({
    email: '',
    password: ''
  });

  let isLoading = $state(false);
  let error = $state('');
  let success = $state('');

  async function handleLogin(event: Event) {
		event.preventDefault();
    // Clear previous messages
    error = '';
    success = '';
    isLoading = true;

    try {
      const result = await webAdminLogin(formData);

      if (result.ok) {
        success = '✅ Login successful! Redirecting...';

        // Redirect to dashboard after successful login
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      } else {
        error = `❌ ${result.error?.message || 'Login failed'}`;
      }
    } catch (err: any) {
      error = `❌ Network error: ${err.message}`;
    } finally {
      isLoading = false;
    }
  }

  function handleDemoLogin() {
    formData = {
      email: 'admin@surveylauncher.com',
      password: 'admin123456'
    };
  }

  function handleQuickLogin() {
    formData.email = 'admin@surveylauncher.com';
    formData.password = 'admin123456';
    // Create a mock event to trigger the login
    const mockEvent = new Event('submit');
    handleLogin(mockEvent);
  }
</script>

<svelte:head>
  <title>Login - SurveyLauncher Admin</title>
  <meta name="description" content="Login to SurveyLauncher Admin Dashboard" />
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8">
    <!-- Header -->
    <div>
      <div class="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
        <svg class="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
        Sign in to Admin
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
        SurveyLauncher Management Dashboard
      </p>
    </div>

    <!-- Login Form -->
    <form class="mt-8 space-y-6" onsubmit={handleLogin}>
      <div class="space-y-4">
        <!-- Email -->
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            bind:value={formData.email}
            class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Enter your email address"
          />
        </div>

        <!-- Password -->
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            bind:value={formData.password}
            class="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Enter your password"
          />
        </div>
      </div>

      <!-- Messages -->
      {#if error}
        <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
          {error}
        </div>
      {/if}

      {#if success}
        <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded">
          {success}
        </div>
      {/if}

      <!-- Action Buttons -->
      <div>
        <button
          type="submit"
          disabled={isLoading}
          class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if isLoading}
            <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Signing in...
          {:else}
            Sign in
          {/if}
        </button>
      </div>

      <!-- Demo Actions -->
      <div class="text-center space-y-3">
        <p class="text-xs text-gray-500 dark:text-gray-400">
          For testing purposes:
        </p>
        <div class="flex gap-3 justify-center">
          <button
            type="button"
            onclick={handleDemoLogin}
            class="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline"
          >
            Fill Demo Credentials
          </button>
          <button
            type="button"
            onclick={handleQuickLogin}
            class="text-xs text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 underline font-medium"
          >
            Quick Demo Login
          </button>
        </div>
      </div>
    </form>

    <!-- Navigation -->
    <div class="text-center">
      <a
        href="/"
        class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white underline"
      >
        ← Back to Home
      </a>
    </div>

    <!-- API Info -->
    <div class="text-center text-xs text-gray-500 dark:text-gray-400">
      API Endpoint: {API_BASE_URL}
    </div>
  </div>
</div>