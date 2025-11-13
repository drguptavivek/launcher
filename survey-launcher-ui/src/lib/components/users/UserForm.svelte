<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
		import { Checkbox } from '$lib/components/ui/checkbox';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { Loader2, Save, Eye, EyeOff } from 'lucide-svelte';

	// Props interface
	interface UserFormProps {
		onUserCreated?: (user: any) => void;
		onUserUpdated?: (user: any) => void;
		initialData?: any;
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

	// Available teams and roles (mock data for now)
	let teams = [
		{ id: 'team-001', name: 'Alpha Team' },
		{ id: 'team-002', name: 'Beta Team' },
		{ id: 'team-003', name: 'Gamma Team' }
	];

	let roles = [
		{ value: 'admin', label: 'Administrator' },
		{ value: 'supervisor', label: 'Supervisor' },
		{ value: 'user', label: 'User' },
		{ value: 'readonly', label: 'Read Only' }
	];

	// Validation
	let isFormValid = $derived(() => {
		return formData.name.trim() !== '' &&
			formData.email.trim() !== '' &&
			formData.userCode.trim() !== '' &&
			formData.role !== '' &&
			formData.teamId !== '' &&
			formData.deviceId !== '' &&
			(formData.generatePin || (formData.pin.length >= 6 && formData.pin === formData.confirmPin));
	});

	// Initialize form with data if provided
	$effect(() => {
		if (initialData) {
			formData = {
				name: initialData.name || '',
				email: initialData.email || '',
				userCode: initialData.userCode || '',
				role: initialData.role || 'user',
				teamId: initialData.teamId || '',
				deviceId: initialData.deviceId || '',
				pin: '',
				confirmPin: '',
				isActive: initialData.isActive ?? true,
				generatePin: false // Don't auto-generate PIN when editing
			};
		}
	});

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
		formData[field] = value;
		errors[field] = '';

		// Clear related errors
		if (field === 'pin' || field === 'confirmPin') {
			errors.pin = '';
			errors.confirmPin = '';
		}
	}

	// Generate random PIN
	function generateRandomPin() {
		const pin = Math.floor(100000 + Math.random() * 900000).toString();
		formData.pin = pin;
		formData.confirmPin = pin;
		errors.pin = '';
		errors.confirmPin = '';
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
			// TODO: Replace with actual API call
			await new Promise(resolve => setTimeout(resolve, 1500));

			// Mock successful submission
			const userData = {
				id: initialData?.id || `user-${Date.now()}`,
				...formData,
				pin: formData.generatePin ? generateRandomPin() : formData.pin,
				createdAt: initialData?.createdAt || new Date(),
				lastLogin: initialData?.lastLogin || null
			};

			if (isEditing && onUserUpdated) {
				onUserUpdated(userData);
			} else if (!isEditing && onUserCreated) {
				onUserCreated(userData);
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
					bind:value={formData.name}
					placeholder="Enter full name"
					class={errors.name ? 'border-destructive' : ''}
					on:input={(e) => updateFormField('name', e.target.value)}
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
					bind:value={formData.email}
					placeholder="Enter email address"
					class={errors.email ? 'border-destructive' : ''}
					on:input={(e) => updateFormField('email', e.target.value)}
					disabled={isSubmitting}
				/>
				{#if errors.email}
					<p class="text-sm text-destructive">{errors.email}</p>
				{/if}
			</div>
		</div>

		<div class="grid gap-4 md:grid-cols-2">
			<div class="space-y-2">
				<Label for="userCode">User Code *</Label>
				<Input
					id="userCode"
					bind:value={formData.userCode}
					placeholder="e.g., u001"
					class={errors.userCode ? 'border-destructive' : ''}
					on:input={(e) => updateFormField('userCode', e.target.value)}
					disabled={isSubmitting || isEditing}
				/>
				{#if errors.userCode}
					<p class="text-sm text-destructive">{errors.userCode}</p>
				{/if}
			</div>

			<div class="space-y-2">
				<Label for="deviceId">Device ID *</Label>
				<Input
					id="deviceId"
					bind:value={formData.deviceId}
					placeholder="e.g., dev-mock-001"
					class={errors.deviceId ? 'border-destructive' : ''}
					on:input={(e) => updateFormField('deviceId', e.target.value)}
					disabled={isSubmitting}
				/>
				{#if errors.deviceId}
					<p class="text-sm text-destructive">{errors.deviceId}</p>
				{/if}
			</div>
		</div>

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
				<select bind:value={formData.teamId} id="team" disabled={isSubmitting} class="w-full h-10 px-3 py-2 text-sm border border-input bg-background rounded-md">
					<option value="" disabled>Select a team</option>
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
								bind:value={formData.pin}
								placeholder="Enter 6-digit PIN"
								class={errors.pin ? 'border-destructive pr-10' : 'pr-10'}
								on:input={(e) => updateFormField('pin', e.target.value)}
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
								bind:value={formData.confirmPin}
								placeholder="Confirm PIN"
								class={errors.confirmPin ? 'border-destructive pr-10' : 'pr-10'}
								on:input={(e) => updateFormField('confirmPin', e.target.value)}
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