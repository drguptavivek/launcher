<script lang="ts">
  import { superForm } from 'sveltekit-superforms';
  import { valibotAdapter } from 'sveltekit-superforms/adapters';
  import { RoleFormFactory } from '$lib/forms/factory/role-form-factory';
  import { createRoleStore } from '$lib/stores/role.svelte.js';
  import type { UserRole } from '$lib/types/role.types';
  import { getRoleBasedFieldOptions, isFieldVisible, getRoleDisplayName } from '$lib/utils/role.utils';

  // Props
  let {
    userRole = 'SYSTEM_ADMIN' as UserRole,
    initialData = null,
    project = null,
    onSuccess = () => {},
    onError = () => {}
  } = $props();

  // Role store
  let roleStore = createRoleStore({ userRole });
  let roleDisplayName = $derived(getRoleDisplayName(userRole));

  // Create role-based form using factory
  const { form, errors, message, enhance, submitting } = RoleFormFactory.createForm({
    formType: 'project',
    userRole,
    mode: project ? 'edit' : 'create',
    initialData,
    options: {
      onResult: ({ result }) => {
        if (result.type === 'success') {
          onSuccess(result.data);
        } else {
          onError(result);
        }
      }
    }
  });

  // Role-based field visibility
  let showAdvancedFields = $derived(['SYSTEM_ADMIN', 'REGIONAL_MANAGER'].includes(userRole));
  let showTeamFields = $derived(['SYSTEM_ADMIN', 'REGIONAL_MANAGER', 'FIELD_SUPERVISOR'].includes(userRole));
  let showUserAssignment = $derived(['SYSTEM_ADMIN', 'FIELD_SUPERVISOR'].includes(userRole));

  // Dynamic options based on role
  let geographicScopeOptions = $derived(getRoleBasedFieldOptions(userRole, 'geographicScope'));
  let roleOptions = $derived(getRoleBasedFieldOptions(userRole, 'role'));

  // Mock team and user options (would come from API in real implementation)
  const teamOptions = [
    { value: 'team1', label: 'Team Alpha' },
    { value: 'team2', label: 'Team Beta' },
    { value: 'team3', label: 'Team Gamma' },
    { value: 'team4', label: 'Team Delta' }
  ];

  const userOptions = [
    { value: 'user1', label: 'John Doe' },
    { value: 'user2', label: 'Jane Smith' },
    { value: 'user3', label: 'Bob Johnson' },
    { value: 'user4', label: 'Alice Brown' }
  ];

  const statusOptions = [
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' }
  ];

  const priorityOptions = [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' }
  ];

  // Check if field should be visible for current role
  function isFieldVisibleForRole(fieldName: string): boolean {
    return isFieldVisible(userRole, 'project', fieldName);
  }

  // Helper for field errors
  function getFieldError(fieldName: string): string | null {
    return errors[fieldName]?.[0] || null;
  }
</script>

<div class="max-w-4xl mx-auto p-6">
  <!-- Header with role information -->
  <div class="mb-6">
    <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
      {project ? 'Edit Project' : 'Create Project'}
    </h1>
    <div class="flex items-center space-x-2">
      <span class="text-sm text-gray-600 dark:text-gray-300">Creating as:</span>
      <span class="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-md text-xs font-medium">
        {roleDisplayName}
      </span>
    </div>
  </div>

  <!-- Form -->
  <form method="POST" use:enhance class="space-y-6">
    <!-- Basic fields (visible to all roles that can create projects) -->
    {#if isFieldVisibleForRole('title')}
      <div class="space-y-2">
        <label for="title" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Project Title *
        </label>
        <input
          id="title"
          bind:value={$form.title}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          class:ring-red-500:border-red-500={getFieldError('title')}
          placeholder="Enter project title"
        />
        {#if getFieldError('title')}
          <p class="text-sm text-red-600 dark:text-red-400">{getFieldError('title')}</p>
        {/if}
      </div>
    {/if}

    {#if isFieldVisibleForRole('abbreviation')}
      <div class="space-y-2">
        <label for="abbreviation" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Abbreviation *
        </label>
        <input
          id="abbreviation"
          bind:value={$form.abbreviation}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          class:ring-red-500:border-red-500={getFieldError('abbreviation')}
          placeholder="Enter abbreviation (2-10 chars)"
          maxlength={10}
        />
        {#if getFieldError('abbreviation')}
          <p class="text-sm text-red-600 dark:text-red-400">{getFieldError('abbreviation')}</p>
        {/if}
      </div>
    {/if}

    {#if isFieldVisibleForRole('description')}
      <div class="space-y-2">
        <label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Description
        </label>
        <textarea
          id="description"
          bind:value={$form.description}
          rows={3}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          placeholder="Enter project description"
        ></textarea>
      </div>
    {/if}

    <!-- Status field -->
    {#if isFieldVisibleForRole('status')}
      <div class="space-y-2">
        <label for="status" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Status *
        </label>
        <select
          id="status"
          bind:value={$form.status}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          class:ring-red-500:border-red-500={getFieldError('status')}
        >
          {#each statusOptions as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
        {#if getFieldError('status')}
          <p class="text-sm text-red-600 dark:text-red-400">{getFieldError('status')}</p>
        {/if}
      </div>
    {/if}

    <!-- Role-specific fields -->
    {#if showTeamFields && isFieldVisibleForRole('geographicScope')}
      <div class="space-y-2">
        <label for="geographicScope" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Geographic Scope *
        </label>
        <select
          id="geographicScope"
          bind:value={$form.geographicScope}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          class:ring-red-500:border-red-500={getFieldError('geographicScope')}
        >
          <option value="">Select scope</option>
          {#each geographicScopeOptions as scope}
            <option value={scope}>{scope}</option>
          {/each}
        </select>
        {#if getFieldError('geographicScope')}
          <p class="text-sm text-red-600 dark:text-red-400">{getFieldError('geographicScope')}</p>
        {/if}
      </div>
    {/if}

    {#if showTeamFields && isFieldVisibleForRole('teamIds')}
      <div class="space-y-2">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Assign Teams *
        </label>
        <!-- Simple multi-select for demo (would use proper multi-select component in production) -->
        <div class="space-y-2">
          {#each teamOptions as team}
            <label class="flex items-center space-x-2">
              <input
                type="checkbox"
                bind:group={$form.teamIds}
                value={team.value}
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300">{team.label}</span>
            </label>
          {/each}
        </div>
        {#if getFieldError('teamIds')}
          <p class="text-sm text-red-600 dark:text-red-400">{getFieldError('teamIds')}</p>
        {/if}
      </div>
    {/if}

    {#if showUserAssignment && isFieldVisibleForRole('assignedUsers')}
      <div class="space-y-2">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Assign Users
        </label>
        <div class="space-y-2">
          {#each userOptions as user}
            <label class="flex items-center space-x-2">
              <input
                type="checkbox"
                bind:group={$form.assignedUsers}
                value={user.value}
                class="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300">{user.label}</span>
            </label>
          {/each}
        </div>
        {#if getFieldError('assignedUsers')}
          <p class="text-sm text-red-600 dark:text-red-400">{getFieldError('assignedUsers')}</p>
        {/if}
      </div>
    {/if}

    <!-- Advanced fields (System Admin only) -->
    {#if showAdvancedFields && isFieldVisibleForRole('budget')}
      <div class="space-y-2">
        <label for="budget" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Budget
        </label>
        <input
          id="budget"
          type="number"
          bind:value={$form.budget}
          min="0"
          step="0.01"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          placeholder="Enter budget amount"
        />
        {#if getFieldError('budget')}
          <p class="text-sm text-red-600 dark:text-red-400">{getFieldError('budget')}</p>
        {/if}
      </div>
    {/if}

    {#if showAdvancedFields && isFieldVisibleForRole('priority')}
      <div class="space-y-2">
        <label for="priority" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Priority
        </label>
        <select
          id="priority"
          bind:value={$form.priority}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="">Select priority</option>
          {#each priorityOptions as priority}
            <option value={priority.value}>{priority.label}</option>
          {/each}
        </select>
        {#if getFieldError('priority')}
          <p class="text-sm text-red-600 dark:text-red-400">{getFieldError('priority')}</p>
        {/if}
      </div>
    {/if}

    <!-- Form messages -->
    {#if $message}
      <div class="p-4 rounded-md bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200">
        {$message}
      </div>
    {/if}

    <!-- Form actions -->
    <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
      <button
        type="button"
        onclick={() => window.history.back()}
        class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={$submitting}
        class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {#if $submitting}
          <div class="flex items-center space-x-2">
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Processing...</span>
          </div>
        {:else}
          <span>{project ? 'Update Project' : 'Create Project'}</span>
        {/if}
      </button>
    </div>
  </form>
</div>