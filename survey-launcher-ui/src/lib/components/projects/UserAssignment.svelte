<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '$lib/components/ui/table';
	import { Label } from '$lib/components/ui/label';
	import type { UserAssignment, AssignUserToProjectRequest } from '$lib/api/remote';
	import { getAssignmentScopeColor, getAssignmentScopeLabel, formatDate, isAssignmentActive } from '$lib/api/remote';

	let {
		assignments = [],
		loading = false,
		error = null,
		projectId
	} = $props<{
		assignments?: UserAssignment[];
		loading?: boolean;
		error?: string | null;
		projectId: string;
	}>();

	const dispatch = createEventDispatcher();

	let showAddForm = $state(false);
	let newAssignment = $state<AssignUserToProjectRequest>({
		userId: '',
		scope: 'READ',
		roleInProject: '',
		assignedUntil: ''
	});

	function handleAddUser() {
		dispatch('addUser', { assignment: newAssignment });
		showAddForm = false;
		Object.assign(newAssignment, {
			userId: '',
			scope: 'READ',
			roleInProject: '',
			assignedUntil: ''
		});
	}

	function handleRemoveUser(assignment: UserAssignment) {
		dispatch('removeUser', { assignment });
	}

	function toggleAddForm() {
		showAddForm = !showAddForm;
		error = null;
	}
</script>

<Card>
	<CardHeader>
		<div class="flex items-center justify-between">
			<CardTitle>User Assignments ({assignments.length})</CardTitle>
			<Button variant="outline" size="sm" onclick={toggleAddForm}>
				{showAddForm ? 'Cancel' : 'Add User'}
			</Button>
		</div>
	</CardHeader>
	<CardContent>
		{#if showAddForm}
			<div class="mb-6 p-4 border rounded-lg bg-muted/50">
				<h4 class="font-medium mb-4">Add New User Assignment</h4>
				<form onsubmit={handleAddUser} class="space-y-4">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<Label for="userId">User ID</Label>
							<input
								id="userId"
								type="text"
								class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
								bind:value={newAssignment.userId}
								placeholder="Enter user ID"
								required
							/>
						</div>
						<div>
							<Label for="scope">Access Scope</Label>
							<select
								id="scope"
								class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
								bind:value={newAssignment.scope}
							>
								<option value="READ">Read Only</option>
								<option value="EXECUTE">Execute</option>
								<option value="UPDATE">Update</option>
							</select>
						</div>
						<div>
							<Label for="roleInProject">Role in Project</Label>
							<input
								id="roleInProject"
								type="text"
								class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
								bind:value={newAssignment.roleInProject}
								placeholder="e.g., Developer, Analyst"
							/>
						</div>
						<div>
							<Label for="assignedUntil">Assigned Until (Optional)</Label>
							<input
								id="assignedUntil"
								type="datetime-local"
								class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
								bind:value={newAssignment.assignedUntil}
							/>
						</div>
					</div>
					<div class="flex space-x-2">
						<Button type="submit" disabled={loading}>
							{loading ? 'Adding...' : 'Add User'}
						</Button>
						<Button type="button" variant="outline" onclick={toggleAddForm}>
							Cancel
						</Button>
					</div>
				</form>
			</div>
		{/if}

		{#if loading}
			<div class="flex items-center justify-center py-8">
				<div class="text-muted-foreground">Loading user assignments...</div>
			</div>
		{:else if error}
			<div class="flex items-center justify-center py-8">
				<div class="text-red-600">Error: {error}</div>
			</div>
		{:else if assignments.length === 0}
			<div class="flex items-center justify-center py-8">
				<div class="text-muted-foreground">No user assignments found</div>
			</div>
		{:else}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>User</TableHead>
						<TableHead>Scope</TableHead>
						<TableHead>Role</TableHead>
						<TableHead>Assigned</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each assignments as assignment (assignment.id)}
						<TableRow>
							<TableCell class="font-medium">
								{assignment.userId}
							</TableCell>
							<TableCell>
								<Label class={`px-2 py-1 rounded text-xs font-semibold ${getAssignmentScopeColor(assignment.scope as any)}`}>
									{getAssignmentScopeLabel(assignment.scope as any)}
								</Label>
							</TableCell>
							<TableCell>
								{assignment.roleInProject || '-'}
							</TableCell>
							<TableCell>
								<div class="text-sm">
									<div>{formatDate(assignment.assignedAt)}</div>
									{#if assignment.assignedUntil}
										<div class="text-xs text-muted-foreground">Until: {formatDate(assignment.assignedUntil)}</div>
									{/if}
								</div>
							</TableCell>
							<TableCell>
								<Label class={`px-2 py-1 rounded text-xs font-semibold ${
									isAssignmentActive(assignment.assignedAt, assignment.assignedUntil)
										? 'text-green-600 bg-green-100'
										: 'text-gray-600 bg-gray-100'
								}`}>
									{isAssignmentActive(assignment.assignedAt, assignment.assignedUntil) ? 'Active' : 'Inactive'}
								</Label>
							</TableCell>
							<TableCell>
								<Button
									variant="outline"
									size="sm"
									onclick={() => handleRemoveUser(assignment)}
								>
									Remove
								</Button>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		{/if}
	</CardContent>
</Card>