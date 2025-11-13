<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Navbar from '$lib/components/Navbar.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
	<!-- Include the Navbar component -->
	<Navbar />

	<!-- Main content area -->
	<main id="main-content" tabindex="-1">
		{@render children()}
	</main>
</div>
