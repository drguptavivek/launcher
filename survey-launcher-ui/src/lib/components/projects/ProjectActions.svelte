<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import type { Project } from '$lib/api/remote';

	let {
		project,
		size = 'normal'
	} = $props<{
		project: Project;
		size?: 'normal' | 'small';
	}>();

	const dispatch = createEventDispatcher();

	function handleEdit() {
		dispatch('edit', { project });
	}

	function handleDelete() {
		dispatch('delete', { project });
	}

	function handleManageUsers() {
		dispatch('manageUsers', { project });
	}

	function handleManageTeams() {
		dispatch('manageTeams', { project });
	}

	function handleViewDetails() {
		dispatch('viewDetails', { project });
	}
</script>

<Card>
	<CardHeader>
		<CardTitle class="text-lg">Project Actions</CardTitle>
	</CardHeader>
	<CardContent>
		<div class="space-y-3">
			<div class="grid grid-cols-1 {size === 'normal' ? 'md:grid-cols-2' : ''} gap-3">
				<Button variant="outline" onclick={handleViewDetails} class="w-full">
					View Details
				</Button>
				<Button variant="outline" onclick={handleEdit} class="w-full">
					Edit Project
				</Button>
			</div>

			<div class="grid grid-cols-1 {size === 'normal' ? 'md:grid-cols-2' : ''} gap-3">
				<Button variant="outline" onclick={handleManageUsers} class="w-full">
					Manage Users
				</Button>
				<Button variant="outline" onclick={handleManageTeams} class="w-full">
					Manage Teams
				</Button>
			</div>

			<hr class="my-4" />

			<Button
				variant="outline"
				onclick={handleDelete}
				class="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
			>
				Delete Project
			</Button>
		</div>

		{#if size === 'normal'}
			<div class="mt-4 pt-4 border-t">
				<div class="text-sm text-muted-foreground space-y-2">
					<div><strong>Project ID:</strong> {project.id}</div>
					<div><strong>Organization:</strong> {project.organizationId}</div>
					<div><strong>Created by:</strong> {project.createdBy}</div>
					{#if project.deletedAt}
						<div class="text-red-600"><strong>Deleted:</strong> {project.deletedAt}</div>
					{/if}
				</div>
			</div>
		{/if}
	</CardContent>
</Card>