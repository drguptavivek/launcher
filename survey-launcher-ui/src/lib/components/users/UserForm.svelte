<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
		import { Checkbox } from '$lib/components/ui/checkbox';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Loader2, Save, Eye, EyeOff } from 'lucide-svelte';
	import { updateUser, createUser } from '$lib/api/remote/users.remote';
import { getTeams } from '$lib/api/users.js';
import { type User, type CreateUserRequest, type UpdateUserRequest } from '$lib/api/remote/users.remote';
import { onMount } from 'svelte';

	// Props interface
	interface UserFormProps {
		onUserCreated?: (user: any) => void;
		onUserUpdated?: (user: any) => void;
		initialData?: User | null;
		isEditing?: boolean;
	}

	let {
		onUserCreated,
		onUserUpdated,
		initialData = null,
		isEditing = false
	}: UserFormProps = $props();

	// Form data interface
	interface FormData {
		name: string;
		email: string;
		userCode: string;
		role: string;
		teamId: string;
		deviceId: string;
		pin: string;
		confirmPin: string;
		isActive: boolean;
		generatePin: boolean;
	}

	// Form state
	let formData = $state<FormData>({
		name: '',
		email: '',
		userCode: '',
		role: 'user',
		teamId: '',
		deviceId: '',
		pin: '',
		confirmPin: '',
		isActive: true,
		generatePin: true
	});

	let errors = $state<Record<string, string>>({});
	let isSubmitting = $state(false);
	let showPin = $state(false);
	let showConfirmPin = $state(false);
	let isLoadingTeams = $state(true);

	// Available teams (loaded from API)
	let teams = $state<Array<{ id: string; name: string }>>([]);

	let roles = [
		{ value: 'TEAM_MEMBER', label: 'Team Member' },
		{ value: 'FIELD_SUPERVISOR', label: 'Field Supervisor' },
		{ value: 'REGIONAL_MANAGER', label: 'Regional Manager' },
		{ value: 'SYSTEM_ADMIN', label: 'System Administrator' },
		{ value: 'SUPPORT_AGENT', label: 'Support Agent' },
		{ value: 'AUDITOR', label: 'Auditor' },
		{ value: 'DEVICE_MANAGER', label: 'Device Manager' },
		{ value: 'POLICY_ADMIN', label: 'Policy Administrator' },
		{ value: 'NATIONAL_SUPPORT_ADMIN', label: 'National Support Admin' }
	];

	// Validation
	let isFormValid = $derived(() => {
		return formData.name.trim() !== '' &&
			formData.email.trim() !== '' &&
			formData.userCode.trim() !== '' &&
			formData.role !== '' &&
			formData.teamId !== '' &&
			(formData.generatePin || (formData.pin.length >= 6 && formData.pin === formData.confirmPin));
	});

	// Load teams from API
	async function loadTeams() {
		try {
			// teams = await getTeams();
			// TODO: Implement teams API when available
			teams = [
				{ id: 'team-1', name: 'Team A' },
				{ id: 'team-2', name: 'Team B' },
				{ id: 'team-3', name: 'Team C' }
			];
		} catch (err: any) {
			console.error('Failed to load teams:', err);
			teams = [];
		} finally {
			isLoadingTeams = false;
		}
	}

	// Initialize form with data if provided
	$effect(() => {
		if (initialData) {
			formData = {
				name: initialData.display_name || '',
				email: initialData.email || '',
				userCode: initialData.code || '',
				role: initialData.role || 'TEAM_MEMBER',
				teamId: initialData.team_id || '',
				deviceId: '', // Not in User interface, would need separate device data
				pin: '',
				confirmPin: '',
				isActive: initialData.is_active ?? true,
				generatePin: false // Don't auto-generate PIN when editing
			};
		}
	});

	// Load teams on mount
	onMount(loadTeams);

	// Form validation functions
	function validateField(field: keyof FormData, value: string | boolean): string {
		switch (field) {
			case 'name':
				if (!value || (value as string).trim() === '') {
					return 'Name is required';
				}
				if ((value as string).length < 2) {
					return 'Name must be at least 2 characters';
				}
				break;

			case 'email':
				if (!value || (value as string).trim() === '') {
					return 'Email is required';
				}
				const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
				if (!emailRegex.test(value as string)) {
					return 'Please enter a valid email address';
				}
				break;

			case 'userCode':
				if (!value || (value as string).trim() === '') {
					return 'User code is required';
				}
				if (!/^[a-zA-Z0-9-]+$/.test(value as string)) {
					return 'User code can only contain letters, numbers, and hyphens';
				}
				break;

			case 'pin':
				if (!formData.generatePin && (!value || (value as string).length < 6)) {
					return 'PIN must be at least 6 characters';
				}
				if (!formData.generatePin && !/^\d+$/.test(value as string)) {
					return 'PIN must contain only numbers';
				}
				break;

			case 'confirmPin':
				if (!formData.generatePin && formData.pin !== (value as string)) {
					return 'PINs do not match';
				}
				break;
		}

		return '';
	}

	function updateFormField(field: keyof FormData, value: string | boolean) {
		// Type assertion to handle dynamic field assignment
		(formData as any)[field] = value;
		(errors as any)[field] = '';

		// Clear related errors
		if (field === 'pin' || field === 'confirmPin') {
			(errors as any).pin = '';
			(errors as any).confirmPin = '';
		}
	}

	function handleInputChange(e: Event, field: keyof FormData) {
		const target = e.target as HTMLInputElement;
		updateFormField(field, target.value);
	}

	// Generate random PIN
	function generateRandomPin(): string {
		return Math.floor(100000 + Math.random() * 900000).toString();
	}

	function setGeneratedPin() {
		const pin = generateRandomPin();
		formData.pin = pin;
		formData.confirmPin = pin;
		(errors as any).pin = '';
		(errors as any).confirmPin = '';
	}

	// Form submission
	async function handleSubmit() {
		if (!isFormValid) {
			// Validate all fields
			const fieldErrors: Record<string, string> = {};
			Object.keys(formData).forEach(key => {
				const field = key as keyof FormData;
				if (typeof formData[field] === 'string') {
					const error = validateField(field, formData[field]);
					if (error) fieldErrors[field] = error;
				}
			});
			errors = fieldErrors;
			return;
		}

		isSubmitting = true;
		errors = {};

		try {
			if (isEditing && initialData) {
				// Update existing user
				const updateData: UpdateUserRequest = {
					displayName: formData.name,
					email: formData.email,
					role: formData.role as User['role'],
					isActive: formData.isActive
				};

				// Only include PIN if it's being changed
				if (!formData.generatePin && formData.pin) {
					updateData.pin = formData.pin;
				}

				// Note: Remote functions use form pattern, actual implementation needs to be adapted
				console.log('Update user data:', updateData);
				// const updatedUser = await updateUser(updateData);
				// TODO: Implement proper remote function call
				errors.general = 'Update functionality needs backend implementation';
			} else {
				// Create new user
				const createData: CreateUserRequest = {
					teamId: formData.teamId,
					code: formData.userCode,
					displayName: formData.name,
					email: formData.email,
					role: formData.role as User['role'],
					pin: formData.generatePin ? generateRandomPin() : formData.pin
				};

				// Note: Remote functions use form pattern, actual implementation needs to be adapted
				console.log('Create user data:', createData);
				// const newUser = await createUser(createData);
				// TODO: Implement proper remote function call
				errors.general = 'Create functionality needs backend implementation';
			}

		} catch (error: any) {
			errors.general = error.message || 'Failed to save user';
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		history.back();
	}
</script>

<div class="space-y-6">
	{#if errors.general}
		<Alert variant="destructive">
			<AlertDescription>{errors.general}</AlertDescription>
		</Alert>
	{/if}

	<form onsubmit={handleSubmit} class="space-y-6">
		<!-- Basic Information -->
		<div class="grid gap-4 md:grid-cols-2">
			<div class="space-y-2">
				<Label for="name">Name *</Label>
				<Input
					id="name"
					value={formData.name}
					placeholder="Enter full name"
					class={errors.name ? 'border-destructive' : ''}
					oninput={(e) => handleInputChange(e, 'name')}
					disabled={isSubmitting}
				/>
				{#if errors.name}
					<p class="text-sm text-destructive">{errors.name}</p>
				{/if}
			</div>

			<div class="space-y-2">
				<Label for="email">Email *</Label>
				<Input
					id="email"
					type="email"
					value={formData.email}
					placeholder="Enter email address"
					class={errors.email ? 'border-destructive' : ''}
					oninput={(e) => handleInputChange(e, 'email')}
					disabled={isSubmitting}
				/>
				{#if errors.email}
					<p class="text-sm text-destructive">{errors.email}</p>
				{/if}
			</div>
		</div>

		<div class="space-y-2">
			<Label for="userCode">User Code *</Label>
			<Input
				id="userCode"
				value={formData.userCode}
				placeholder="e.g., u001"
				class={errors.userCode ? 'border-destructive' : ''}
				oninput={(e) => handleInputChange(e, 'userCode')}
				disabled={isSubmitting || isEditing}
			/>
			{#if errors.userCode}
				<p class="text-sm text-destructive">{errors.userCode}</p>
			{/if}
		</div>

		<!-- Note: Device ID would be managed separately through device management -->

		<!-- Role and Team Assignment -->
		<div class="grid gap-4 md:grid-cols-2">
			<div class="space-y-2">
				<Label for="role">Role *</Label>
				<select bind:value={formData.role} id="role" disabled={isSubmitting} class="w-full h-10 px-3 py-2 text-sm border border-input bg-background rounded-md">
					<option value="" disabled>Select a role</option>
					{#each roles as role}
						<option value={role.value}>{role.label}</option>
					{/each}
				</select>
			</div>

			<div class="space-y-2">
				<Label for="team">Team *</Label>
				<select bind:value={formData.teamId} id="team" disabled={isSubmitting || isLoadingTeams} class="w-full h-10 px-3 py-2 text-sm border border-input bg-background rounded-md">
					<option value="" disabled>{isLoadingTeams ? 'Loading teams...' : 'Select a team'}</option>
					{#each teams as team}
						<option value={team.id}>{team.name}</option>
					{/each}
				</select>
			</div>
		</div>

		<!-- PIN Configuration -->
		<div class="space-y-4">
			<div class="flex items-center space-x-2">
				<Checkbox
					bind:checked={formData.generatePin}
					id="generatePin"
					disabled={isSubmitting}
				/>
				<Label for="generatePin">Generate random PIN</Label>
			</div>

			{#if !formData.generatePin}
				<div class="grid gap-4 md:grid-cols-2">
					<div class="space-y-2">
						<Label for="pin">PIN *</Label>
						<div class="relative">
							<Input
								id="pin"
								type={showPin ? 'text' : 'password'}
								value={formData.pin}
								placeholder="Enter 6-digit PIN"
								class={errors.pin ? 'border-destructive pr-10' : 'pr-10'}
								oninput={(e) => handleInputChange(e, 'pin')}
								disabled={isSubmitting}
							/>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								class="absolute right-0 top-0 h-full"
								onclick={() => showPin = !showPin}
								disabled={isSubmitting}
							>
								{#if showPin}
									<EyeOff class="h-4 w-4" />
								{:else}
									<Eye class="h-4 w-4" />
								{/if}
							</Button>
						</div>
						{#if errors.pin}
							<p class="text-sm text-destructive">{errors.pin}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label for="confirmPin">Confirm PIN *</Label>
						<div class="relative">
							<Input
								id="confirmPin"
								type={showConfirmPin ? 'text' : 'password'}
								value={formData.confirmPin}
								placeholder="Confirm PIN"
								class={errors.confirmPin ? 'border-destructive pr-10' : 'pr-10'}
								oninput={(e) => handleInputChange(e, 'confirmPin')}
								disabled={isSubmitting}
							/>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								class="absolute right-0 top-0 h-full"
								onclick={() => showConfirmPin = !showConfirmPin}
								disabled={isSubmitting}
							>
								{#if showConfirmPin}
									<EyeOff class="h-4 w-4" />
								{:else}
									<Eye class="h-4 w-4" />
								{/if}
							</Button>
						</div>
						{#if errors.confirmPin}
							<p class="text-sm text-destructive">{errors.confirmPin}</p>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<!-- Status -->
		{#if isEditing}
			<div class="flex items-center space-x-2">
				<Checkbox
					bind:checked={formData.isActive}
					id="isActive"
					disabled={isSubmitting}
				/>
				<Label for="isActive">User is active</Label>
			</div>
		{/if}

		<!-- Actions -->
		<div class="flex items-center gap-4 pt-4">
			<Button
				type="submit"
				disabled={!isFormValid || isSubmitting}
				class="min-w-[120px]"
			>
				{#if isSubmitting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{isEditing ? 'Updating...' : 'Creating...'}
				{:else}
					<Save class="mr-2 h-4 w-4" />
					{isEditing ? 'Update User' : 'Create User'}
				{/if}
			</Button>

			<Button
				type="button"
				variant="outline"
				onclick={handleCancel}
				disabled={isSubmitting}
			>
				Cancel
			</Button>
		</div>
	</form>
</div>