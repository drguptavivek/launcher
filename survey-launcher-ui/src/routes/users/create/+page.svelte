<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { ArrowLeft } from 'lucide-svelte';
	import UserForm from '$lib/components/users/UserForm.svelte';

	// Page metadata
	let pageTitle = $state('Create New User');
	let pageDescription = $state('Add a new user to the system with appropriate permissions');

	function handleGoBack() {
		history.back();
	}

	function handleUserCreated(user: any) {
		// Redirect to user details or users list
		window.location.href = '/users';
	}
</script>

<div class="container mx-auto py-6 space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-4">
		<Button variant="outline" size="icon" onclick={handleGoBack}>
			<ArrowLeft class="h-4 w-4" />
		</Button>
		<div>
			<h1 class="text-3xl font-bold tracking-tight">{pageTitle}</h1>
			<p class="text-muted-foreground">{pageDescription}</p>
		</div>
	</div>

	<!-- User Form -->
	<Card class="max-w-2xl">
		<CardHeader>
			<CardTitle>User Information</CardTitle>
			<CardDescription>
				Enter the user's details and assign appropriate permissions.
			</CardDescription>
		</CardHeader>
		<CardContent>
			<UserForm onUserCreated={handleUserCreated} />
		</CardContent>
	</Card>
</div>