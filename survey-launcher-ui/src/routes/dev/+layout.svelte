<!-- Development Layout - Only accessible in development mode -->
<script lang="ts">
  import DevNavbar from '$lib/components/DevNavbar.svelte';
  import { browser } from '$app/environment';
  import { redirect } from '@sveltejs/kit';

  let { children } = $props();

  // Block access in production
  $effect(() => {
    if (browser && import.meta.env.PROD) {
      throw redirect(302, '/dashboard');
    }
  });
</script>

<svelte:head>
  <title>Development Tools - SurveyLauncher</title>
  <meta name="description" content="Development tools and testing utilities for SurveyLauncher" />
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
  <!-- Development Navigation -->
  <DevNavbar />

  <!-- Main content area -->
  <main id="main-content" tabindex="-1" class="dev-main-content">
    <!-- Development Banner -->
    <div class="dev-banner bg-gradient-to-r from-orange-500 to-pink-500 text-white p-3 text-center font-semibold">
      🚧 Development Environment - For Internal Use Only
    </div>

    <!-- Page Content -->
    <div class="container mx-auto px-4 py-6">
      {@render children()}
    </div>
  </main>
</div>

<style>
  .dev-main-content {
    min-height: calc(100vh - 64px); /* Account for navbar */
  }

  .dev-banner {
    position: sticky;
    top: 0;
    z-index: 40;
    font-size: 0.875rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
</style>