<!-- Create Project Page -->
<script lang="ts">
  import { createProject } from '$lib/api/remote';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { ArrowLeft } from 'lucide-svelte';
  import type { CreateProjectRequest } from '$lib/api/remote';

  // Form state
  let formData = $state<CreateProjectRequest>({
    title: '',
    abbreviation: '',
    description: '',
    geographicScope: 'NATIONAL'
  });

  let validationErrors = $state<Record<string, string[]>>({});
  let isSubmitting = $state(false);
  let submitError = $state<string | null>(null);

  // Validation
  let isValid = $derived(() => {
    return formData.title.trim().length > 0 &&
           formData.abbreviation.trim().length > 0 &&
           Object.values(validationErrors).every(errors => errors.length === 0);
  });

  // Form handlers
  function handleInputChange(field: keyof CreateProjectRequest, value: string) {
    (formData as any)[field] = value;
    validationErrors[field] = [];
    submitError = null;
    validateField(field, value);
  }

  function validateField(field: keyof CreateProjectRequest, value: string) {
    const errors: string[] = [];

    switch (field) {
      case 'title':
        if (!value.trim()) {
          errors.push('Project title is required');
        } else if (value.length > 200) {
          errors.push('Project title must be less than 200 characters');
        } else if (!/^[a-zA-Z0-9\s\-_().]+$/.test(value)) {
          errors.push('Project title contains invalid characters');
        }
        break;
      case 'abbreviation':
        if (!value.trim()) {
          errors.push('Abbreviation is required');
        } else if (value.length > 10) {
          errors.push('Abbreviation must be less than 10 characters');
        } else if (!/^[A-Z0-9_]+$/.test(value.toUpperCase())) {
          errors.push('Abbreviation must contain only uppercase letters, numbers, and underscores');
        }
        break;
      case 'description':
        if (value.length > 2000) {
          errors.push('Description must be less than 2000 characters');
        }
        break;
    }

    validationErrors[field] = errors;
  }

  // Note: Form submission is handled automatically by the createProject remote function
  // The remote function will be called when the form is submitted

  function handleCancel() {
    window.location.href = '/projects';
  }

  function resetForm() {
    formData = {
      title: '',
      abbreviation: '',
      description: '',
      geographicScope: 'NATIONAL'
    };
    validationErrors = {};
    submitError = null;
  }
</script>

<div class="container mx-auto px-4 py-6 max-w-3xl">
  <!-- Header -->
  <div class="mb-8">
    <div class="flex items-center gap-4">
      <Button variant="outline" onclick={handleCancel} class="flex items-center gap-2">
        <ArrowLeft class="w-4 h-4" />
        Back to Projects
      </Button>
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Create New Project</h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          Set up a new survey project with its basic information
        </p>
      </div>
    </div>
  </div>

  <!-- Form -->
  <Card>
    <CardHeader>
      <CardTitle>Project Information</CardTitle>
    </CardHeader>
    <CardContent>
      <form {...createProject} class="space-y-6">
        <!-- Basic Information -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-2">
            <label for="title" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Project Title <span class="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              bind:value={formData.title}
              oninput={(e) => {
                const target = e.target as HTMLInputElement;
                handleInputChange('title', target.value);
              }}
              placeholder="Enter project title"
              maxlength="200"
              required
            />
            {#if validationErrors.title?.length > 0}
              <div class="text-sm text-red-600">
                {#each validationErrors.title as error}
                  <div>{error}</div>
                {/each}
              </div>
            {/if}
          </div>

          <div class="space-y-2">
            <label for="abbreviation" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Abbreviation <span class="text-red-500">*</span>
            </label>
            <input
              id="abbreviation"
              type="text"
              class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
              bind:value={formData.abbreviation}
              oninput={(e) => handleInputChange('abbreviation', (e.target as HTMLInputElement).value)}
              placeholder="PROJECT"
              maxlength="10"
              pattern="[A-Z0-9_]+"
              required
            />
            {#if validationErrors.abbreviation?.length > 0}
              <div class="text-sm text-red-600">
                {#each validationErrors.abbreviation as error}
                  <div>{error}</div>
                {/each}
              </div>
            {/if}
            <p class="text-xs text-gray-500">
              Use uppercase letters, numbers, and underscores only
            </p>
          </div>
        </div>

        <!-- Description -->
        <div class="space-y-2">
          <label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </label>
          <textarea
            id="description"
            rows="4"
            class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            bind:value={formData.description}
            oninput={(e) => {
				const target = e.target as HTMLTextAreaElement;
				handleInputChange('description', target.value);
			}}
            placeholder="Enter project description (optional)"
            maxlength="2000"
          ></textarea>
          <p class="text-xs text-gray-500">
            {formData.description?.length || 0} / 2000 characters
          </p>
          {#if validationErrors.description?.length > 0}
            <div class="text-sm text-red-600">
              {#each validationErrors.description as error}
                <div>{error}</div>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Settings -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="space-y-2">
            <label for="geographicScope" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Geographic Scope <span class="text-red-500">*</span>
            </label>
            <select
              id="geographicScope"
              class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              bind:value={formData.geographicScope}
              onchange={(e) => {
					const target = e.target as HTMLSelectElement;
					handleInputChange('geographicScope', target.value);
				}}
              required
            >
              <option value="NATIONAL">National</option>
              <option value="REGIONAL">Regional</option>
            </select>
            {#if validationErrors.geographicScope?.length > 0}
              <div class="text-sm text-red-600">
                {#each validationErrors.geographicScope as error}
                  <div>{error}</div>
                {/each}
              </div>
            {/if}
          </div>

          <div class="space-y-2">
            <label for="status" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Initial Status <span class="text-red-500">*</span>
            </label>
            <select
              id="status"
              class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onchange={(e) => {
					const target = e.target as HTMLSelectElement;
					// Note: status field should be added to formData interface
					// handleInputChange('status', target.value);
				}}
              required
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <p class="text-xs text-gray-500">
              You can change this later from the project settings
            </p>
          </div>
        </div>

        <!-- Error Display -->
        {#if submitError}
          <div class="bg-red-50 border border-red-200 rounded-md p-4">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4a1 1 0 00-1.414-1.414L10 12.586l-1.293 1.293a1 1 0 101.414 1.414l4-4z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-red-800">Error</h3>
                <div class="mt-2 text-sm text-red-700">
                  {submitError}
                </div>
              </div>
            </div>
          </div>
        {/if}

        <!-- Form Actions -->
        <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="outline"
            onclick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Project'}
          </Button>
        </div>
      </form>
    </CardContent>
  </Card>
</div>

<style>
  .container {
    min-height: calc(100vh - 4rem);
  }
</style>