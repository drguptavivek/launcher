<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '$lib/components/ui/table';
	import { Label } from '$lib/components/ui/label';
	import type { Project } from '$lib/api/remote';
	import { getProjectStatusColor, getGeographicScopeLabel, formatDate } from '$lib/api/remote/projects.utils';

	let {
		projects = [],
		loading = false,
		error = null
	} = $props<{
		projects: Project[];
		loading?: boolean;
		error?: string | null;
	}>();

	const dispatch = createEventDispatcher();

	function handleProjectClick(project: Project) {
		dispatch('projectClick', { project });
	}

	function handleEditClick(event: MouseEvent, project: Project) {
		event.stopPropagation();
		dispatch('editProject', { project });
	}

	function handleDeleteClick(event: MouseEvent, project: Project) {
		event.stopPropagation();
		dispatch('deleteProject', { project });
	}
</script>

<Card>
	<CardHeader>
		<CardTitle>Projects ({projects.length})</CardTitle>
	</CardHeader>
	<CardContent>
		{#if loading}
			<div class="flex items-center justify-center py-8">
				<div class="text-muted-foreground">Loading projects...</div>
			</div>
		{:else if error}
			<div class="flex items-center justify-center py-8">
				<div class="text-red-600">Error: {error}</div>
			</div>
		{:else if projects.length === 0}
			<div class="flex items-center justify-center py-8">
				<div class="text-muted-foreground">No projects found</div>
			</div>
		{:else}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Title</TableHead>
						<TableHead>Abbreviation</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Scope</TableHead>
						<TableHead>Created</TableHead>
						<TableHead>Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each projects as project (project.id)}
						<TableRow
							class="cursor-pointer hover:bg-muted/50"
							onclick={() => handleProjectClick(project)}
						>
							<TableCell class="font-medium">
								<div>
									<div>{project.title}</div>
									{#if project.description}
										<div class="text-sm text-muted-foreground">{project.description}</div>
									{/if}
								</div>
							</TableCell>
							<TableCell>
								<Label class="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs font-semibold">
									{project.abbreviation}
								</Label>
							</TableCell>
							<TableCell>
								<Label class={`px-2 py-1 rounded text-xs font-semibold ${getProjectStatusColor(project.status)}`}>
									{project.status}
								</Label>
							</TableCell>
							<TableCell>
								{getGeographicScopeLabel(project.geographicScope)}
							</TableCell>
							<TableCell>
								<div class="text-sm">
									{formatDate(project.createdAt)}
								</div>
							</TableCell>
							<TableCell>
								<div class="flex space-x-2">
									<Button
										variant="outline"
										size="sm"
										onclick={(e) => handleEditClick(e, project)}
									>
										Edit
									</Button>
									<Button
										variant="outline"
										size="sm"
										onclick={(e) => handleDeleteClick(e, project)}
									>
										Delete
									</Button>
								</div>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		{/if}
	</CardContent>
</Card>