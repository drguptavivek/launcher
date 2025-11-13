<!-- Test page to check imports and state -->
<script>
  import { auth } from '$lib/stores/auth';
  import { API_BASE_URL } from '$lib/api';
</script>

<div class="p-8">
  <h1>SurveyLauncher Admin Test Page</h1>

  <div class="space-y-4">
    <p><strong>API Base URL:</strong> {API_BASE_URL}</p>
    <p><strong>Auth State:</strong></p>
    <pre class="bg-gray-100 p-4 rounded">
      {JSON.stringify(auth.state, null, 2)}
    </pre>
  </div>

  <div class="flex gap-4">
    <button
      onclick={() => console.log('Auth state:', auth.state)}
      class="bg-blue-500 text-white px-4 py-2 rounded"
    >
      Log Auth State
    </button>

    <button
      onclick={() => auth.initialize()}
      class="bg-green-500 text-white px-4 py-2 rounded"
    >
      Initialize Auth
    </button>
  </div>
</div>

<style>
  /* Test styles */
  .space-y-4 > * + * {
    margin-top: 1rem;
  }

  .flex.gap-4 > * + * {
    margin-left: 1rem;
  }
</style>