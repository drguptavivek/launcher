<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import UserTable from '$lib/components/users/UserTable.svelte';
	import { Plus } from 'lucide-svelte';

	// Page metadata
	let pageTitle = $state('User Management');
	let pageDescription = $state('Manage system users, permissions, and access control');
</script>

<div class="container mx-auto py-6 space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">{pageTitle}</h1>
			<p class="text-muted-foreground">{pageDescription}</p>
		</div>

		<Button onclick={() => window.location.href = '/users/create'} class="gap-2">
			<Plus class="h-4 w-4" />
			Add User
		</Button>
	</div>

	<!-- User Table -->
	<Card>
		<CardHeader>
			<CardTitle>Users</CardTitle>
			<CardDescription>
				A list of all users in the system including their status and permissions.
			</CardDescription>
		</CardHeader>
		<CardContent>
			<UserTable />
		</CardContent>
	</Card>
</div>