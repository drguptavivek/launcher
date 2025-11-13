<!-- SurveyLauncher Admin Frontend - Landing Page -->
<script>
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { onMount } from 'svelte';
  import { API_BASE_URL } from '$lib/api';

  let backendStatus = 'Checking...';
  let backendAvailable = false;

  onMount(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (response.ok) {
        backendStatus = 'Available';
        backendAvailable = true;
      } else {
        backendStatus = 'Unavailable';
      }
    } catch (error) {
      backendStatus = 'Connection Failed';
    }
  });
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
  <div class="container mx-auto px-4 py-16">
    <div class="text-center mb-16">
      <h1 class="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
        SurveyLauncher Admin
      </h1>
      <p class="text-xl text-slate-600 dark:text-slate-400 mb-8">
        Management interface for the SurveyLauncher backend system
      </p>

      <div class="flex items-center justify-center gap-2 mb-8">
        <div class="h-3 w-3 rounded-full" class:bg-green-500={backendAvailable} class:bg-red-500={!backendAvailable}></div>
        <span class="text-sm text-slate-600 dark:text-slate-400">
          Backend API: {backendStatus}
        </span>
      </div>

      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <Button href="/auth/login" variant="default" size="lg">
          Login to Admin
        </Button>
        <Button href="/test" variant="outline" size="lg">
          Test Implementation
        </Button>
      </div>
    </div>

    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
      <Card>
        <CardHeader>
          <CardTitle>🔐 Authentication</CardTitle>
          <CardDescription>
            Secure JWT-based authentication with multi-factor security
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul class="text-sm text-slate-600 dark:text-slate-400 space-y-1">
            <li>• Device-based authentication</li>
            <li>• User code + PIN system</li>
            <li>• Automatic token refresh</li>
            <li>• Session management</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>👥 User Management</CardTitle>
          <CardDescription>
            Complete user lifecycle management and administration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul class="text-sm text-slate-600 dark:text-slate-400 space-y-1">
            <li>• User CRUD operations</li>
            <li>• Team assignments</li>
            <li>• Device provisioning</li>
            <li>• Activity monitoring</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📱 Device Management</CardTitle>
          <CardDescription>
            Device provisioning, monitoring, and configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul class="text-sm text-slate-600 dark:text-slate-400 space-y-1">
            <li>• Device registration</li>
            <li>• Policy enforcement</li>
            <li>• GPS tracking</li>
            <li>• Telemetry monitoring</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>🏢 Team Management</CardTitle>
          <CardDescription>
            Hierarchical team organization and management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul class="text-sm text-slate-600 dark:text-slate-400 space-y-1">
            <li>• Team hierarchy</li>
            <li>• Supervisor assignments</li>
            <li>• Policy inheritance</li>
            <li>• Reporting structure</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📋 Policy Editor</CardTitle>
          <CardDescription>
            Visual policy creation and compliance management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul class="text-sm text-slate-600 dark:text-slate-400 space-y-1">
            <li>• Visual policy builder</li>
            <li>• Time window rules</li>
            <li>• GPS requirements</li>
            <li>• Compliance monitoring</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>📊 Telemetry Dashboard</CardTitle>
          <CardDescription>
            Real-time analytics and monitoring dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul class="text-sm text-slate-600 dark:text-slate-400 space-y-1">
            <li>• Real-time metrics</li>
            <li>• GPS tracking maps</li>
            <li>• Device status</li>
            <li>• Alert management</li>
          </ul>
        </CardContent>
      </Card>
    </div>

    <div class="text-center">
      <Card class="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>🚀 Getting Started</CardTitle>
          <CardDescription>
            Navigate to different sections of the admin interface
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <strong class="text-slate-900 dark:text-slate-100">Main Pages:</strong>
              <ul class="text-slate-600 dark:text-slate-400 mt-1">
                <li>• <a href="/auth/login" class="hover:text-primary">Login Page</a></li>
                <li>• <a href="/dashboard" class="hover:text-primary">Dashboard</a></li>
                <li>• <a href="/users" class="hover:text-primary">User Management</a></li>
                <li>• <a href="/devices" class="hover:text-primary">Device Management</a></li>
              </ul>
            </div>
            <div>
              <strong class="text-slate-900 dark:text-slate-100">Test Pages:</strong>
              <ul class="text-slate-600 dark:text-slate-400 mt-1">
                <li>• <a href="/test" class="hover:text-primary">Implementation Test</a></li>
                <li>• <a href="/components" class="hover:text-primary">Component Library</a></li>
                <li>• <a href="/styleguide" class="hover:text-primary">Style Guide</a></li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</div>
