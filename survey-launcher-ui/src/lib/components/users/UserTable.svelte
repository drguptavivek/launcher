<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
		import { Search, Edit, Eye, MoreHorizontal } from 'lucide-svelte';
	import { onMount } from 'svelte';

	// Define User interface
	interface User {
		id: string;
		name: string;
		email: string;
		userCode: string;
		role: string;
		teamName: string;
		deviceId: string;
		isActive: boolean;
		lastLogin: Date;
		createdAt: Date;
	}

	// Component state
	let users = $state<User[]>([]);
	let filteredUsers = $state<User[]>([]);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let searchQuery = $state('');
	let roleFilter = $state('all');
	let statusFilter = $state('all');

	// Derived state for filtering
	let displayUsers = $derived.by(() => {
		return filteredUsers.filter(user => {
			const matchesSearch = !searchQuery ||
				user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
				user.userCode.toLowerCase().includes(searchQuery.toLowerCase());

			const matchesRole = roleFilter === 'all' || user.role === roleFilter;
			const matchesStatus = statusFilter === 'all' ||
				(statusFilter === 'active' && user.isActive) ||
				(statusFilter === 'inactive' && !user.isActive);

			return matchesSearch && matchesRole && matchesStatus;
		});
	});

	// Mock data for development
	onMount(async () => {
		try {
			// TODO: Replace with actual API call
			// const userData = await fetchUsers();

			await new Promise(resolve => setTimeout(resolve, 800));

			// Mock users data
			users = [
				{
					id: 'user-001',
					name: 'John Doe',
					email: 'john.doe@example.com',
					userCode: 'u001',
					role: 'admin',
					teamName: 'Alpha Team',
					deviceId: 'dev-mock-001',
					isActive: true,
					lastLogin: new Date('2024-01-15T10:30:00Z'),
					createdAt: new Date('2024-01-01T00:00:00Z')
				},
				{
					id: 'user-002',
					name: 'Jane Smith',
					email: 'jane.smith@example.com',
					userCode: 'u002',
					role: 'supervisor',
					teamName: 'Beta Team',
					deviceId: 'dev-mock-002',
					isActive: true,
					lastLogin: new Date('2024-01-14T15:45:00Z'),
					createdAt: new Date('2024-01-02T00:00:00Z')
				},
				{
					id: 'user-003',
					name: 'Robert Johnson',
					email: 'robert.johnson@example.com',
					userCode: 'u003',
					role: 'user',
					teamName: 'Alpha Team',
					deviceId: 'dev-mock-003',
					isActive: false,
					lastLogin: new Date('2024-01-10T09:15:00Z'),
					createdAt: new Date('2024-01-03T00:00:00Z')
				},
				{
					id: 'user-004',
					name: 'Sarah Williams',
					email: 'sarah.williams@example.com',
					userCode: 'u004',
					role: 'user',
					teamName: 'Gamma Team',
					deviceId: 'dev-mock-004',
					isActive: true,
					lastLogin: new Date('2024-01-13T14:20:00Z'),
					createdAt: new Date('2024-01-04T00:00:00Z')
				},
				{
					id: 'user-005',
					name: 'Michael Brown',
					email: 'michael.brown@example.com',
					userCode: 'u005',
					role: 'readonly',
					teamName: 'Beta Team',
					deviceId: 'dev-mock-005',
					isActive: true,
					lastLogin: new Date('2024-01-12T11:10:00Z'),
					createdAt: new Date('2024-01-05T00:00:00Z')
				}
			];

			filteredUsers = users;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load users';
		} finally {
			isLoading = false;
		}
	});

	// Utility functions
	function getStatusClass(isActive: boolean) {
		return isActive
			? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
			: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100';
	}

	function getRoleClass(role: string) {
		switch (role) {
			case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100';
			case 'supervisor': return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100';
			case 'readonly': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
			default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
		}
	}

	function formatDate(date: Date) {
		return date.toLocaleDateString();
	}

	function viewUser(userId: string) {
		window.location.href = `/users/${userId}`;
	}

	function editUser(userId: string) {
		window.location.href = `/users/${userId}/edit`;
	}
</script>

<div class="space-y-4">
	<!-- Search and Filters -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="relative flex-1 max-w-sm">
			<Search class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
			<Input
				bind:value={searchQuery}
				placeholder="Search users..."
				class="pl-10"
			/>
		</div>

		<div class="flex gap-2">
			<select bind:value={roleFilter} class="w-[150px] h-10 px-3 py-2 text-sm border border-input bg-background rounded-md">
				<option value="all">All Roles</option>
				<option value="admin">Admin</option>
				<option value="supervisor">Supervisor</option>
				<option value="user">User</option>
				<option value="readonly">Read Only</option>
			</select>

			<select bind:value={statusFilter} class="w-[150px] h-10 px-3 py-2 text-sm border border-input bg-background rounded-md">
				<option value="all">All Status</option>
				<option value="active">Active</option>
				<option value="inactive">Inactive</option>
			</select>
		</div>
	</div>

	<!-- Loading State -->
	{#if isLoading}
		<div class="flex items-center justify-center py-12">
			<div class="text-center">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
				<p class="text-muted-foreground">Loading users...</p>
			</div>
		</div>
	{:else if error}
		<div class="text-center py-12">
			<p class="text-destructive">{error}</p>
		</div>
	{:else}
		<!-- Users Table -->
		<div class="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>User</TableHead>
						<TableHead>User Code</TableHead>
						<TableHead>Role</TableHead>
						<TableHead>Team</TableHead>
						<TableHead>Status</TableHead>
						<TableHead>Last Login</TableHead>
						<TableHead class="w-[100px]">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each displayUsers as user (user.id)}
						<TableRow>
							<TableCell>
								<div>
									<div class="font-medium">{user.name}</div>
									<div class="text-sm text-muted-foreground">{user.email}</div>
								</div>
							</TableCell>
							<TableCell>
								<code class="text-sm bg-muted px-2 py-1 rounded">{user.userCode}</code>
							</TableCell>
							<TableCell>
								<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {getRoleClass(user.role)} capitalize">
									{user.role}
								</span>
							</TableCell>
							<TableCell>{user.teamName}</TableCell>
							<TableCell>
								<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {getStatusClass(user.isActive)}">
									{user.isActive ? 'Active' : 'Inactive'}
								</span>
							</TableCell>
							<TableCell>
								<div class="text-sm">
									{formatDate(user.lastLogin)}
								</div>
							</TableCell>
							<TableCell>
								<div class="flex items-center gap-2">
									<Button
										variant="ghost"
										size="icon"
										onclick={() => viewUser(user.id)}
										title="View user"
									>
										<Eye class="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										onclick={() => editUser(user.id)}
										title="Edit user"
									>
										<Edit class="h-4 w-4" />
									</Button>
								</div>
							</TableCell>
						</TableRow>
					{:else}
						<TableRow>
							<TableCell colSpan={7} class="text-center py-12">
								<div class="text-muted-foreground">
									{searchQuery || roleFilter !== 'all' || statusFilter !== 'all'
										? 'No users found matching your filters.'
										: 'No users found.'}
								</div>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		</div>

		<!-- Results Summary -->
		<div class="text-sm text-muted-foreground">
			Showing {displayUsers.length} of {users.length} users
		</div>
	{/if}
</div>