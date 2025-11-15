<!-- Development Navigation Bar -->
<script lang="ts">
  let isMenuOpen = $state(false);

  const devNavigation = [
    { href: '/dev', label: 'Dev Home', icon: 'home' },
    { href: '/dev/test', label: 'Test Suite', icon: 'test-tube' },
    { href: '/dev/components', label: 'Components', icon: 'component' },
    { href: '/dev/test-projects', label: 'Project Tests', icon: 'folder' },
    { href: '/dev/role-test', label: 'Role Tests', icon: 'shield' },
  ];

  const comingSoonNavigation = [
    { href: '/dev/api-explorer', label: 'API Explorer', icon: 'api' },
    { href: '/dev/logs', label: 'Logs', icon: 'log' },
    { href: '/dev/playground', label: 'Playground', icon: 'play' },
  ];

  function toggleMenu() {
    isMenuOpen = !isMenuOpen;
  }

  // Helper function to render navigation icons
  function getDevNavIcon(iconName: string) {
    const icons: Record<string, string> = {
      'home': 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      'test-tube': 'M7 3v18a2 2 0 002 2h6a2 2 0 002-2V3M7 3l6-2m0 0l6 2M7 3h12m-6 12v4m0 0l2 2m-2-2l-2 2',
      'component': 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
      'folder': 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z',
      'shield': 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      'api': 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
      'log': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      'play': 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z'
    };
    return icons[iconName] || 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
  }
</script>

<!-- Development Navigation Bar -->
<nav class="bg-gradient-to-r from-orange-600 to-pink-600 shadow-lg border-b border-orange-700">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex justify-between items-center h-16">
      <!-- Logo and main navigation -->
      <div class="flex items-center">
        <!-- Logo -->
        <div class="flex-shrink-0">
          <a href="/dev" class="flex items-center">
            <div class="h-8 w-8 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center mr-3">
              <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <span class="text-xl font-bold text-white">Dev Tools</span>
          </a>
        </div>

        <!-- Desktop navigation -->
        <div class="hidden md:block ml-10">
          <div class="flex items-baseline space-x-4">
            {#each devNavigation as item}
              <a
                href={item.href}
                class="text-white/90 hover:text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-white/10 transition-colors flex items-center space-x-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getDevNavIcon(item.icon)} />
                </svg>
                <span>{item.label}</span>
              </a>
            {/each}

            <!-- Separator -->
            <div class="border-l border-white/30 h-6 mx-2"></div>

            <!-- Coming soon items -->
            {#each comingSoonNavigation as item}
              <a
                href={item.href}
                class="text-white/60 hover:text-white/80 px-3 py-2 rounded-md text-sm font-medium hover:bg-white/5 transition-colors flex items-center space-x-2 cursor-not-allowed opacity-75"
                title="Coming soon"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getDevNavIcon(item.icon)} />
                </svg>
                <span>{item.label}</span>
                <span class="text-xs bg-white/20 px-2 py-1 rounded">Soon</span>
              </a>
            {/each}
          </div>
        </div>
      </div>

      <!-- Right side buttons -->
      <div class="hidden md:flex items-center space-x-4">
        <a
          href="/"
          class="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors backdrop-blur"
        >
          🏠 Back to App
        </a>
      </div>

      <!-- Mobile menu button -->
      <div class="md:hidden">
        <button
          onclick={toggleMenu}
          class="inline-flex items-center justify-center p-2 rounded-md text-white/80 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
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
    <div class="md:hidden bg-white/10 backdrop-blur">
      <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3">
        {#each devNavigation as item}
          <a
            href={item.href}
            class="text-white/90 hover:text-white block px-3 py-2 rounded-md text-base font-medium hover:bg-white/10 flex items-center space-x-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getDevNavIcon(item.icon)} />
            </svg>
            <span>{item.label}</span>
          </a>
        {/each}

        <!-- Separator for mobile -->
        <div class="border-t border-white/20 my-2"></div>

        {#each comingSoonNavigation as item}
          <a
            href={item.href}
            class="text-white/60 hover:text-white/80 block px-3 py-2 rounded-md text-base font-medium hover:bg-white/5 flex items-center space-x-2 cursor-not-allowed opacity-75"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getDevNavIcon(item.icon)} />
            </svg>
            <span>{item.label}</span>
            <span class="text-xs bg-white/20 px-2 py-1 rounded">Soon</span>
          </a>
        {/each}
      </div>

      <div class="pt-4 pb-3 border-t border-white/20">
        <div class="px-2 space-y-1">
          <a
            href="/"
            class="bg-white/20 hover:bg-white/30 text-white block px-3 py-2 rounded-md text-base font-medium transition-colors backdrop-blur"
          >
            🏠 Back to Main App
          </a>
        </div>
      </div>
    </div>
  {/if}
</nav>