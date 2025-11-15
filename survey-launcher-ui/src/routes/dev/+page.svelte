<!-- Development Tools Homepage -->
<script lang="ts">
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import { Badge } from '$lib/components/ui/badge';

  const devTools = [
    {
      href: '/dev/test',
      title: 'Implementation Test',
      description: 'Test API integrations and authentication flows',
      icon: '🧪',
      badge: 'Core',
      badgeVariant: 'default'
    },
    {
      href: '/dev/components',
      title: 'Component Library',
      description: 'Browse and test UI components',
      icon: '🎨',
      badge: 'UI/UX',
      badgeVariant: 'secondary'
    },
    {
      href: '/dev/test-projects',
      title: 'Project Testing',
      description: 'Test project management features',
      icon: '📁',
      badge: 'Projects',
      badgeVariant: 'outline'
    },
    {
      href: '/dev/role-test',
      title: 'Role Testing',
      description: 'Test role-based access control',
      icon: '👥',
      badge: 'Security',
      badgeVariant: 'destructive'
    },
    {
      href: '/dev/api-explorer',
      title: 'API Explorer',
      description: 'Interactive API testing and documentation',
      icon: '🔧',
      badge: 'Coming Soon',
      badgeVariant: 'outline'
    },
    {
      href: '/dev/logs',
      title: 'Application Logs',
      description: 'View real-time application logs',
      icon: '📋',
      badge: 'Coming Soon',
      badgeVariant: 'outline'
    }
  ];

  const sections = [
    {
      title: 'Testing Tools',
      description: 'Tools for testing application functionality',
      tools: devTools.filter(tool => ['Core', 'Projects', 'Security'].includes(tool.badge))
    },
    {
      title: 'Development Utilities',
      description: 'Development and debugging utilities',
      tools: devTools.filter(tool => ['UI/UX', 'Coming Soon'].includes(tool.badge))
    }
  ];
</script>

<svelte:head>
  <title>Development Tools - SurveyLauncher</title>
</svelte:head>

<div class="space-y-8">
  <!-- Header -->
  <div class="text-center">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
      Development Tools
    </h1>
    <p class="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
      Internal development tools and testing utilities for the SurveyLauncher platform.
    </p>
  </div>

  <!-- Environment Info -->
  <Card class="max-w-4xl mx-auto">
    <CardHeader>
      <CardTitle class="flex items-center gap-2">
        <span>🌍</span>
        Environment Information
      </CardTitle>
      <CardDescription>
        Current development environment details
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div class="grid md:grid-cols-2 gap-4">
        <div class="space-y-2">
          <div class="flex justify-between">
            <span class="text-sm font-medium text-gray-600 dark:text-gray-400">Mode:</span>
            <Badge variant="secondary">Development</Badge>
          </div>
          <div class="flex justify-between">
            <span class="text-sm font-medium text-gray-600 dark:text-gray-400">API URL:</span>
            <code class="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
              {import.meta.env.PUBLIC_SURVEY_LAUNCHER_API_URL || 'Not configured'}
            </code>
          </div>
        </div>
        <div class="space-y-2">
          <div class="flex justify-between">
            <span class="text-sm font-medium text-gray-600 dark:text-gray-400">Version:</span>
            <Badge variant="outline">{import.meta.env.VITE_APP_VERSION || '0.0.1'}</Badge>
          </div>
          <div class="flex justify-between">
            <span class="text-sm font-medium text-gray-600 dark:text-gray-400">Build:</span>
            <Badge variant="outline">{import.meta.env.MODE}</Badge>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>

  <!-- Development Tools Grid -->
  <div class="max-w-6xl mx-auto">
    {#each sections as section}
      <div class="mb-8">
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">{section.title}</h2>
        <p class="text-gray-600 dark:text-gray-400 mb-6">{section.description}</p>

        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each section.tools as tool}
            <Card class="hover:shadow-lg transition-shadow cursor-pointer group">
              <CardHeader>
                <div class="flex items-start justify-between">
                  <div class="flex items-center gap-3">
                    <span class="text-2xl">{tool.icon}</span>
                    <div>
                      <CardTitle class="text-lg">{tool.title}</CardTitle>
                      <Badge
                        variant={tool.badgeVariant === 'destructive' ? 'destructive' :
                               tool.badgeVariant === 'secondary' ? 'secondary' : 'outline'}
                        class="mt-1"
                      >
                        {tool.badge}
                      </Badge>
                    </div>
                  </div>
                </div>
                <CardDescription class="mt-2">
                  {tool.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button href={tool.href} class="w-full group-hover:bg-primary/90 transition-colors">
                  {tool.badge === 'Coming Soon' ? 'View Details' : 'Open Tool'}
                </Button>
              </CardContent>
            </Card>
          {/each}
        </div>
      </div>
    {/each}
  </div>

  <!-- Quick Links -->
  <Card class="max-w-4xl mx-auto">
    <CardHeader>
      <CardTitle>🔗 Quick Links</CardTitle>
      <CardDescription>
        Quick access to main application areas
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div class="flex flex-wrap gap-4">
        <Button href="/" variant="outline" size="sm">
          🏠 Home
        </Button>
        <Button href="/dashboard" variant="outline" size="sm">
          📊 Dashboard
        </Button>
        <Button href="/users" variant="outline" size="sm">
          👥 Users
        </Button>
        <Button href="/projects" variant="outline" size="sm">
          📁 Projects
        </Button>
        <Button href="/auth/login" variant="outline" size="sm">
          🔐 Login
        </Button>
      </div>
    </CardContent>
  </Card>
</div>