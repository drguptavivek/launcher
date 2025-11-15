<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import type { Project, CreateProjectRequest, UpdateProjectRequest } from '$lib/api/remote';
	import { validateProjectTitle, validateProjectAbbreviation, validateGeographicScope } from '$lib/api/remote';

	let {
		project = null,
		loading = false,
		error = null
	} = $props<{
		project?: Project | null;
		loading?: boolean;
		error?: string | null;
	}>();

	let formData = $state({
		title: '',
		abbreviation: '',
		description: '',
		geographicScope: 'NATIONAL' as 'NATIONAL' | 'REGIONAL',
		status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE'
	});

	let validationErrors = $state({
		title: [] as string[],
		abbreviation: [] as string[],
		geographicScope: [] as string[]
	});

	const dispatch = createEventDispatcher();

	$effect(() => {
		if (project) {
			formData = {
				title: project.title,
				abbreviation: project.abbreviation,
				description: project.description || '',
				geographicScope: project.geographicScope,
				status: project.status
			};
		} else {
			formData = {
				title: '',
				abbreviation: '',
				description: '',
				geographicScope: 'NATIONAL',
				status: 'ACTIVE'
			};
		}
	});

	function validateForm(): boolean {
		validationErrors.title = validateProjectTitle(formData.title);
		validationErrors.abbreviation = validateProjectAbbreviation(formData.abbreviation);
		validationErrors.geographicScope = validateGeographicScope(formData.geographicScope);

		return validationErrors.title.length === 0 &&
			   validationErrors.abbreviation.length === 0 &&
			   validationErrors.geographicScope.length === 0;
	}

	function handleSubmit(event: Event) {
		event.preventDefault();
		if (!validateForm()) {
			error = 'Please fix the validation errors below';
			return;
		}

		const submitData = project
			? { ...formData, id: project.id } as UpdateProjectRequest
			: formData as CreateProjectRequest;

		dispatch('submit', { data: submitData, isEdit: !!project });
	}

	function handleCancel() {
		dispatch('cancel');
	}

	function handleInputChange(field: keyof typeof formData, value: string) {
		formData[field] = value as any;
		validationErrors[field] = [];
		error = null;
	}
</script>

<Card>
	<CardHeader>
		<CardTitle>{project ? 'Edit Project' : 'Create New Project'}</CardTitle>
	</CardHeader>
	<CardContent>
		<form onsubmit={handleSubmit} class="space-y-6">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div class="space-y-2">
					<Label for="title">Project Title *</Label>
					<input
						id="title"
						type="text"
						class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
						bind:value={formData.title}
						placeholder="Enter project title"
						oninput={() => handleInputChange('title', formData.title)}
					/>
					{#if validationErrors.title.length > 0}
						<div class="text-sm text-red-600">
							{#each validationErrors.title as error}
								<div>{error}</div>
							{/each}
						</div>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="abbreviation">Abbreviation *</Label>
					<input
						id="abbreviation"
						type="text"
						class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
						bind:value={formData.abbreviation}
						placeholder="PROJECT"
						oninput={() => handleInputChange('abbreviation', formData.abbreviation)}
					/>
					{#if validationErrors.abbreviation.length > 0}
						<div class="text-sm text-red-600">
							{#each validationErrors.abbreviation as error}
								<div>{error}</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<div class="space-y-2">
				<Label for="description">Description</Label>
				<textarea
					id="description"
					class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
					bind:value={formData.description}
					placeholder="Enter project description"
					rows="3"
				></textarea>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div class="space-y-2">
					<Label for="geographicScope">Geographic Scope *</Label>
					<select
						id="geographicScope"
						class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
						bind:value={formData.geographicScope}
						onchange={() => handleInputChange('geographicScope', formData.geographicScope)}
					>
						<option value="NATIONAL">National</option>
						<option value="REGIONAL">Regional</option>
					</select>
					{#if validationErrors.geographicScope.length > 0}
						<div class="text-sm text-red-600">
							{#each validationErrors.geographicScope as error}
								<div>{error}</div>
							{/each}
						</div>
					{/if}
				</div>

				{#if project}
					<div class="space-y-2">
						<Label for="status">Status</Label>
						<select
							id="status"
							class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
							bind:value={formData.status}
						>
							<option value="ACTIVE">Active</option>
							<option value="INACTIVE">Inactive</option>
						</select>
					</div>
				{/if}
			</div>

			{#if error}
				<div class="text-sm text-red-600 bg-red-50 p-3 rounded-md">
					{error}
				</div>
			{/if}

			<div class="flex justify-end space-x-3 pt-4">
				<Button
					type="button"
					variant="outline"
					onclick={handleCancel}
					disabled={loading}
				>
					Cancel
				</Button>
				<Button
					type="submit"
					disabled={loading}
				>
					{loading ? 'Saving...' : (project ? 'Update Project' : 'Create Project')}
				</Button>
			</div>
		</form>
	</CardContent>
</Card>