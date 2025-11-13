<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
		import { ArrowLeft, Edit, Shield, Smartphone, Calendar } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { getUserById } from '$lib/api/users.js';
import { type User } from '$lib/api/remote/users.utils';

	// Props for user ID from URL parameter
	let { params } = $props();

	// User data state
	let user = $state<User | null>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null);

	// Derived values
	let userStatus = $derived.by(() => {
		if (!user) return 'unknown';
		return user.isActive ? 'Active' : 'Inactive';
	});

	let statusClass = $derived.by(() => {
		if (!user) return 'bg-gray-100 text-gray-800';
		return user.isActive
			? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
			: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100';
	});

	onMount(async () => {
		try {
			// Load user from API
			const userData = await getUserById(params.id);
			if (userData) {
				user = userData;
			} else {
				error = 'User not found';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load user';
		} finally {
			isLoading = false;
		}
	});

	function handleGoBack() {
		history.back();
	}

	function handleEdit() {
		window.location.href = `/users/${params.id}/edit`;
	}
</script>

<div class="container mx-auto py-6 space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<Button variant="outline" size="icon" onclick={handleGoBack}>
				<ArrowLeft class="h-4 w-4" />
			</Button>
			<div>
				<h1 class="text-3xl font-bold tracking-tight">User Details</h1>
				<p class="text-muted-foreground">View and manage user information and permissions</p>
			</div>
		</div>

		{#if !isLoading && user}
			<Button onclick={handleEdit} class="gap-2">
				<Edit class="h-4 w-4" />
				Edit User
			</Button>
		{/if}
	</div>

	{#if isLoading}
		<div class="flex items-center justify-center py-12">
			<div class="text-center">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
				<p class="text-muted-foreground">Loading user details...</p>
			</div>
		</div>
	{:else if error}
		<Card>
			<CardContent class="py-6">
				<div class="text-center text-destructive">
					<p>{error}</p>
				</div>
			</CardContent>
		</Card>
	{:else if user}
		<div class="grid gap-6 md:grid-cols-2">
			<!-- Basic Information -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<Shield class="h-5 w-5" />
						Basic Information
					</CardTitle>
				</CardHeader>
				<CardContent class="space-y-4">
					<div class="grid grid-cols-2 gap-4">
						<div>
							<span class="text-sm font-medium text-muted-foreground">Name</span>
							<p class="font-semibold">{user.name}</p>
						</div>
						<div>
							<span class="text-sm font-medium text-muted-foreground">Email</span>
							<p class="font-semibold">{user.email}</p>
						</div>
						<div>
							<span class="text-sm font-medium text-muted-foreground">User Code</span>
							<p class="font-semibold">{user.userCode}</p>
						</div>
						<div>
							<span class="text-sm font-medium text-muted-foreground">Status</span>
							<div class="mt-1">
								<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {statusClass}">
									{userStatus}
								</span>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<!-- Role & Team -->
			<Card>
				<CardHeader>
					<CardTitle>Role & Team</CardTitle>
				</CardHeader>
				<CardContent class="space-y-4">
					<div>
						<span class="text-sm font-medium text-muted-foreground">Role</span>
						<p class="font-semibold capitalize">{user.role}</p>
					</div>
					<div>
						<span class="text-sm font-medium text-muted-foreground">Team</span>
						<p class="font-semibold">{user.teamName}</p>
					</div>
					<div>
						<span class="text-sm font-medium text-muted-foreground">Team ID</span>
						<p class="font-mono text-sm">{user.teamId}</p>
					</div>
				</CardContent>
			</Card>

			<!-- Device Information -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<Smartphone class="h-5 w-5" />
						Device Information
					</CardTitle>
				</CardHeader>
				<CardContent class="space-y-4">
					<div>
						<span class="text-sm font-medium text-muted-foreground">Device ID</span>
						<p class="font-mono text-sm">{user.deviceId}</p>
					</div>
					<div>
						<span class="text-sm font-medium text-muted-foreground">Device Status</span>
						<p class="font-semibold">Online</p>
					</div>
				</CardContent>
			</Card>

			<!-- Activity Information -->
			<Card>
				<CardHeader>
					<CardTitle class="flex items-center gap-2">
						<Calendar class="h-5 w-5" />
						Activity Information
					</CardTitle>
				</CardHeader>
				<CardContent class="space-y-4">
					<div>
						<span class="text-sm font-medium text-muted-foreground">Last Login</span>
						<p class="font-semibold">{user.lastLogin.toLocaleDateString()} {user.lastLogin.toLocaleTimeString()}</p>
					</div>
					<div>
						<span class="text-sm font-medium text-muted-foreground">Account Created</span>
						<p class="font-semibold">{user.createdAt.toLocaleDateString()}</p>
					</div>
				</CardContent>
			</Card>
		</div>
	{/if}
</div>