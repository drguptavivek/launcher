<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import type { Project } from '$lib/api/remote';
	import { getProjectStatusColor, getGeographicScopeLabel, formatDate } from '$lib/api/remote';

	let {
		project,
		showActions = true
	} = $props<{
		project: Project;
		showActions?: boolean;
	}>();

	const dispatch = createEventDispatcher();

	function handleClick() {
		dispatch('click', { project });
	}

	function handleEdit(event: MouseEvent) {
		event.stopPropagation();
		dispatch('edit', { project });
	}

	function handleDelete(event: MouseEvent) {
		event.stopPropagation();
		dispatch('delete', { project });
	}

	function handleUsers(event: MouseEvent) {
		event.stopPropagation();
		dispatch('manageUsers', { project });
	}

	function handleTeams(event: MouseEvent) {
		event.stopPropagation();
		dispatch('manageTeams', { project });
	}
</script>

<Card class="cursor-pointer hover:shadow-md transition-shadow" onclick={handleClick}>
	<CardHeader class="pb-3">
		<div class="flex items-start justify-between">
			<div class="flex-1">
				<CardTitle class="text-lg mb-1">{project.title}</CardTitle>
				<div class="flex items-center space-x-2 mb-2">
					<Label class={`px-2 py-1 rounded text-xs font-semibold ${getProjectStatusColor(project.status)}`}>
						{project.status}
					</Label>
					<Label class="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-semibold">
						{project.abbreviation}
					</Label>
				</div>
				{#if project.description}
					<CardDescription class="line-clamp-2">
						{project.description}
					</CardDescription>
				{/if}
			</div>
			{#if showActions}
				<div class="flex space-x-1">
					<Button variant="outline" size="sm" onclick={handleEdit}>
						Edit
					</Button>
				</div>
			{/if}
		</div>
	</CardHeader>
	<CardContent class="pt-0">
		<div class="space-y-3">
			<div class="flex items-center justify-between text-sm">
				<span class="text-muted-foreground">Scope:</span>
				<span>{getGeographicScopeLabel(project.geographicScope)}</span>
			</div>
			<div class="flex items-center justify-between text-sm">
				<span class="text-muted-foreground">Created:</span>
				<span>{formatDate(project.createdAt)}</span>
			</div>
			{#if project.updatedAt && project.updatedAt !== project.createdAt}
				<div class="flex items-center justify-between text-sm">
					<span class="text-muted-foreground">Updated:</span>
					<span>{formatDate(project.updatedAt)}</span>
				</div>
			{/if}
			{#if showActions}
				<div class="flex space-x-2 pt-2 border-t">
					<Button variant="outline" size="sm" onclick={handleUsers} class="flex-1">
						Users
					</Button>
					<Button variant="outline" size="sm" onclick={handleTeams} class="flex-1">
						Teams
					</Button>
					<Button variant="outline" size="sm" onclick={handleDelete} class="text-red-600 hover:text-red-700">
						Delete
					</Button>
				</div>
			{/if}
		</div>
	</CardContent>
</Card>