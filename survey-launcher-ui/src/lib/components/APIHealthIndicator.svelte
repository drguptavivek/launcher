<!-- API Health Indicator Component -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { API_BASE_URL } from '$lib/api/client';

  let healthStatus = $state<'checking' | 'healthy' | 'unhealthy' | 'error'>('checking');
  let lastCheck = $state<Date | null>(null);
  let checkInterval = $state<NodeJS.Timeout | null>(null);

  async function checkAPIHealth() {
    try {
      healthStatus = 'checking';

      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (response.ok) {
        healthStatus = 'healthy';
      } else {
        healthStatus = 'unhealthy';
      }
    } catch (error) {
      healthStatus = 'error';
    } finally {
      lastCheck = new Date();
    }
  }

  // Function to format last check time
  function formatLastCheck(date: Date): string {
    return date.toLocaleTimeString();
  }

  // Function to get status color
  function getStatusColor(): string {
    switch (healthStatus) {
      case 'healthy':
        return 'bg-green-500';
      case 'unhealthy':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      case 'checking':
        return 'bg-gray-500 animate-pulse';
      default:
        return 'bg-gray-500';
    }
  }

  // Function to get status text
  function getStatusText(): string {
    switch (healthStatus) {
      case 'healthy':
        return 'API Healthy';
      case 'unhealthy':
        return 'API Unhealthy';
      case 'error':
        return 'API Error';
      case 'checking':
        return 'Checking...';
      default:
        return 'Unknown';
    }
  }

  // Manual check function
  async function manualCheck() {
    await checkAPIHealth();
  }

  // Keyboard handler for accessibility
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      manualCheck();
    }
  }

  onMount(() => {
    // Initial check
    checkAPIHealth();

    // Set up interval for periodic checks (every 30 seconds)
    checkInterval = setInterval(checkAPIHealth, 30000);
  });

  onDestroy(() => {
    if (checkInterval) {
      clearInterval(checkInterval);
    }
  });
</script>

<button
  type="button"
  class="flex items-center space-x-2 cursor-pointer group bg-transparent border-none p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
  onclick={manualCheck}
  onkeydown={handleKeydown}
  title="API Health Status - Click or press Enter/Space to refresh"
  aria-label="API Health Status - Check connection"
>
  <!-- Status Dot -->
  <div class="relative">
    <div
      class="w-2 h-2 rounded-full transition-all duration-300 {getStatusColor()}"
      class:ring-2={healthStatus === 'healthy' ? 'ring-green-200' : healthStatus === 'error' ? 'ring-red-200' : 'ring-yellow-200'}
      class:ring-offset-1={healthStatus === 'healthy' ? 'ring-offset-green-50' : healthStatus === 'error' ? 'ring-offset-red-50' : 'ring-offset-yellow-50'}
    ></div>

    <!-- Pulse effect for healthy status -->
    {#if healthStatus === 'healthy'}
      <div class="absolute inset-0 w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
    {/if}
  </div>

  <!-- Status Text (visible on hover and larger screens) -->
  <span class="hidden sm:block text-xs font-medium transition-colors group-hover:text-gray-900 dark:group-hover:text-white
                  {healthStatus === 'healthy' ? 'text-green-600 dark:text-green-400' :
                   healthStatus === 'error' ? 'text-red-600 dark:text-red-400' :
                   healthStatus === 'unhealthy' ? 'text-yellow-600 dark:text-yellow-400' :
                   'text-gray-600 dark:text-gray-400'}">
    {getStatusText()}
  </span>

  <!-- Mobile status indicator (dot only) -->
  <span class="sm:hidden text-xs font-medium transition-colors group-hover:text-gray-900 dark:group-hover:text-white
                  {healthStatus === 'healthy' ? 'text-green-600 dark:text-green-400' :
                   healthStatus === 'error' ? 'text-red-600 dark:text-red-400' :
                   healthStatus === 'unhealthy' ? 'text-yellow-600 dark:text-yellow-400' :
                   'text-gray-600 dark:text-gray-400'}">
    {lastCheck ? formatLastCheck(lastCheck) : getStatusText()}
  </span>
</button>

<style>
  /* Custom animation for the pulse effect */
  @keyframes ping {
    75%, 100% {
      transform: scale(2);
      opacity: 0;
    }
  }

  .animate-ping {
    animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
  }
</style>