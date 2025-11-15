<!-- Test page to check imports and state -->
<script>
  import { API_BASE_URL } from '$lib/api';
  import { authUtils } from '$lib/utils/auth.utils';

  let testResult = $state('No test run yet');
  let authStatus = $state('Unknown');
</script>

<div class="p-8">
  <h1 class="text-3xl font-bold mb-6">SurveyLauncher Admin Test Page</h1>

  <div class="space-y-6">
    <!-- API Configuration Test -->
    <div class="bg-white p-6 rounded-lg shadow border">
      <h2 class="text-xl font-semibold mb-4">🔧 Configuration Test</h2>
      <div class="space-y-2">
        <p><strong>API Base URL:</strong></p>
        <code class="bg-gray-100 px-3 py-2 rounded block">{API_BASE_URL}</code>
      </div>
    </div>

    <!-- Authentication Status -->
    <div class="bg-white p-6 rounded-lg shadow border">
      <h2 class="text-xl font-semibold mb-4">🔐 Authentication Status</h2>
      <div class="space-y-2">
        <p><strong>Auth Status:</strong> {authStatus}</p>
        <p><strong>Has Access Token:</strong> {authUtils.getAccessToken() ? 'Yes' : 'No'}</p>
        <p><strong>Has Refresh Token:</strong> {authUtils.getRefreshToken() ? 'Yes' : 'No'}</p>
      </div>
    </div>

    <!-- Test Results -->
    <div class="bg-white p-6 rounded-lg shadow border">
      <h2 class="text-xl font-semibold mb-4">📊 Test Results</h2>
      <div class="space-y-4">
        <p><strong>Test Status:</strong> {testResult}</p>

        <div class="flex gap-4">
          <button
            onclick={() => {
              authStatus = authUtils.isAuthenticated() ? 'Authenticated' : 'Not Authenticated';
              testResult = '✅ Auth check completed successfully';
            }}
            class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
          >
            Check Auth Status
          </button>

          <button
            onclick={() => {
              authUtils.clearAuthTokens();
              authStatus = 'Logged Out';
              testResult = '✅ Auth tokens cleared successfully';
            }}
            class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors"
          >
            Clear Auth Tokens
          </button>

          <button
            onclick={() => {
              // Test sample login data
              const testData = {
                deviceId: 'dev-mock-001',
                userCode: 'u001',
                pin: '123456'
              };
              testResult = `✅ Test data ready: ${JSON.stringify(testData, null, 2)}`;
            }}
            class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-colors"
          >
            Load Test Data
          </button>
        </div>
      </div>
    </div>
  </div>
</div>