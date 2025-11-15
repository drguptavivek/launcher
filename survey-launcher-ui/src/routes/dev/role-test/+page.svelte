<script lang="ts">
  import RoleBasedProjectForm from '$lib/components/projects/RoleBasedProjectForm.svelte';
  import { setRoleContext, createRoleStore } from '$lib/stores/role.svelte.js';
  import type { UserRole } from '$lib/types/role.types';
  import { getRoleDisplayName } from '$lib/utils/role.utils';

  // Test different roles
  const testRoles: UserRole[] = [
    'SYSTEM_ADMIN',
    'REGIONAL_MANAGER',
    'FIELD_SUPERVISOR',
    'TEAM_MEMBER',
    'SUPPORT_AGENT',
    'AUDITOR',
    'DEVICE_MANAGER',
    'POLICY_ADMIN',
    'NATIONAL_SUPPORT_ADMIN'
  ];

  // Current selected role
  let selectedRole = $state<UserRole>('SYSTEM_ADMIN');
  let showForm = $state(false);

  // Create role store for the selected role
  let roleStore = $derived(() => createRoleStore({ userRole: selectedRole }));
  let roleDisplayName = $derived(() => getRoleDisplayName(selectedRole));

  // Set role context when it changes
  $effect(() => {
    const store = roleStore();
    setRoleContext(store);
  });

  function handleRoleChange() {
    showForm = false; // Hide form when role changes
  }

  function showProjectForm() {
    showForm = true;
  }

  function handleProjectSuccess(data: any) {
    console.log('Project created successfully:', data);
    alert(`Project created successfully by ${roleDisplayName}!`);
    showForm = false;
  }

  function handleProjectError(error: any) {
    console.error('Project creation error:', error);
    alert(`Error creating project: ${error.message || 'Unknown error'}`);
  }

  // Mock navigation back to prevent actual navigation during testing
  function mockBack() {
    showForm = false;
  }
</script>

<svelte:head>
  <title>Role-Based Form Test - SurveyLauncher</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
  <div class="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Role-Based Form Testing
      </h1>
      <p class="text-gray-600 dark:text-gray-300">
        Test different form interfaces based on user roles in the SurveyLauncher 9-role RBAC system.
      </p>
    </div>

    <!-- Role Selection -->
    <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        Select Role to Test
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div class="space-y-2">
          <label for="role-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Choose Role:
          </label>
          <select
            id="role-select"
            bind:value={selectedRole}
            onchange={handleRoleChange}
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            {#each testRoles as role}
              <option value={role}>{getRoleDisplayName(role)}</option>
            {/each}
          </select>
        </div>

        <div class="space-y-2">
          <span class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Current Role:
          </span>
          <div class="flex items-center space-x-2">
            <span class="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-md text-sm font-medium">
              {roleDisplayName}
            </span>
          </div>
        </div>

        <div class="space-y-2">
          <span class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Action:
          </span>
          <button
            onclick={showProjectForm}
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            Test Project Form
          </button>
        </div>
      </div>

      <!-- Role Information -->
      <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Role Capabilities:
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
          <div>
            <h4 class="font-medium text-gray-900 dark:text-white mb-1">Can Create:</h4>
            <ul class="list-disc list-inside space-y-1">
              {#if ['SYSTEM_ADMIN', 'REGIONAL_MANAGER'].includes(selectedRole)}
                <li>✅ Projects (with geographic scope)</li>
              {:else if selectedRole === 'FIELD_SUPERVISOR'}
                <li>✅ Projects (local scope only)</li>
              {:else}
                <li>❌ Projects (insufficient permissions)</li>
              {/if}

              {#if ['SYSTEM_ADMIN', 'REGIONAL_MANAGER', 'FIELD_SUPERVISOR'].includes(selectedRole)}
                <li>✅ Users (role-restricted)</li>
              {:else}
                <li>❌ Users (insufficient permissions)</li>
              {/if}

              {#if ['SYSTEM_ADMIN', 'DEVICE_MANAGER', 'REGIONAL_MANAGER'].includes(selectedRole)}
                <li>✅ Devices</li>
              {:else}
                <li>❌ Devices (insufficient permissions)</li>
              {/if}
            </ul>
          </div>

          <div>
            <h4 class="font-medium text-gray-900 dark:text-white mb-1">Special Permissions:</h4>
            <ul class="list-disc list-inside space-y-1">
              {#if selectedRole === 'SYSTEM_ADMIN'}
                <li>✅ Full system access</li>
                <li>✅ National scope projects</li>
                <li>✅ Budget management</li>
                <li>✅ Policy administration</li>
              {:else if selectedRole === 'REGIONAL_MANAGER'}
                <li>✅ Regional oversight</li>
                <li>✅ Team management</li>
                <li>✅ Project approval</li>
              {:else if selectedRole === 'FIELD_SUPERVISOR'}
                <li>✅ Team member assignment</li>
                <li>✅ Local projects only</li>
                <li>✅ Supervisor override</li>
              {:else if selectedRole === 'AUDITOR'}
                <li>✅ Audit reports</li>
                <li>✅ Compliance checks</li>
                <li>✅ Sensitive data access</li>
              {:else}
                <li>📋 Role-specific capabilities</li>
              {/if}
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Form Display -->
    {#if showForm}
      <div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
            Project Form ({roleDisplayName})
          </h2>
          <button
            onclick={mockBack}
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <RoleBasedProjectForm
          userRole={selectedRole}
          onSuccess={handleProjectSuccess}
          onError={handleProjectError}
        />
      </div>
    {:else}
      <!-- Instructions -->
      <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 class="text-lg font-medium text-blue-900 dark:text-blue-100 mb-2">
          How to Test Role-Based Forms
        </h3>
        <ol class="list-decimal list-inside space-y-2 text-blue-800 dark:text-blue-200">
          <li>Select a role from the dropdown above</li>
          <li>Click "Test Project Form" to open the role-based project creation form</li>
          <li>Notice how different roles see different fields and validation rules</li>
          <li>Try submitting the form to see role-based validation in action</li>
          <li>Test different roles to see the complete RBAC system in action</li>
        </ol>

        <div class="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
          <h4 class="font-medium text-blue-900 dark:text-blue-100 mb-2">Key Features to Test:</h4>
          <ul class="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200 text-sm">
            <li><strong>System Admin</strong>: All fields visible, national scope available</li>
            <li><strong>Regional Manager</strong>: Most fields, regional scope only</li>
            <li><strong>Field Supervisor</strong>: Limited fields, local scope, team assignment</li>
            <li><strong>Other Roles</strong>: Will see "insufficient permissions" error</li>
          </ul>
        </div>
      </div>
    {/if}

    <!-- Navigation Links -->
    <div class="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
      <div class="flex justify-between">
        <a href="/test" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
          ← Back to Test Page
        </a>
        <a href="/dashboard" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
          Dashboard →
        </a>
      </div>
    </div>
  </div>
</div>