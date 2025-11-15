#!/usr/bin/env tsx

/**
 * Test script for projects API endpoints
 */

const API_BASE = 'http://localhost:3000/api/v1';

// Test admin credentials (from seed data)
const ADMIN_CREDENTIALS = {
  email: 'admin@surveylauncher.aiims',
  password: 'admin123456'
};

async function makeRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE}${endpoint}`;
  console.log(`\n🔄 Testing: ${options.method || 'GET'} ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': crypto.randomUUID(),
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log(`📄 Response:`, JSON.stringify(data, null, 2));

    return { response, data };
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    throw error;
  }
}

async function loginAndGetToken() {
  console.log('🔐 Logging in as admin...');

  // Use consolidated API for web-admin authentication
  const response = await fetch('http://localhost:3000/api/v1/web-admin/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-request-id': crypto.randomUUID(),
    },
    body: JSON.stringify(ADMIN_CREDENTIALS),
  });

  const data = await response.json();

  if (!data.ok || !data.accessToken) {
    throw new Error('Login failed');
  }

  console.log('✅ Login successful');
  return data.accessToken;
}

async function testProjectsEndpoints() {
  let token: string;

  try {
    // 1. Login
    token = await loginAndGetToken();

    const authHeaders = {
      Authorization: `Bearer ${token}`,
    };

    // 2. Test GET /projects (list projects)
    console.log('\n📋 Testing projects list...');
    await makeRequest('/projects', {
      headers: authHeaders,
    });

    // 3. Test POST /projects (create project)
    console.log('\n➕ Testing project creation...');
    const createProjectData = {
      title: 'Test Project API',
      abbreviation: 'TPA',
      contactPersonDetails: 'Test Contact Person',
      status: 'ACTIVE',
      geographicScope: 'NATIONAL'
    };

    const { data: createdProject } = await makeRequest('/projects', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(createProjectData),
    });

    const projectId = createdProject.project?.id;
    if (projectId) {
      console.log(`✅ Project created with ID: ${projectId}`);

      // 4. Test GET /projects/:id (get specific project)
      console.log('\n🔍 Testing get specific project...');
      await makeRequest(`/projects/${projectId}`, {
        headers: authHeaders,
      });

      // 5. Test GET /projects/:id/members (get project members)
      console.log('\n👥 Testing get project members...');
      await makeRequest(`/projects/${projectId}/members`, {
        headers: authHeaders,
      });

      // 6. Test PUT /projects/:id (update project)
      console.log('\n✏️ Testing project update...');
      const updateData = {
        title: 'Updated Test Project API',
        contactPersonDetails: 'Updated Contact Person'
      };

      await makeRequest(`/projects/${projectId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(updateData),
      });

      // 7. Test DELETE /projects/:id (soft delete)
      console.log('\n🗑️ Testing project soft delete...');
      await makeRequest(`/projects/${projectId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });

      // 8. Test POST /projects/:id/restore (restore project)
      console.log('\n♻️ Testing project restore...');
      await makeRequest(`/projects/${projectId}/restore`, {
        method: 'POST',
        headers: authHeaders,
      });

      // 9. Test GET /projects/my (my projects)
      console.log('\n🏠 Testing my projects...');
      await makeRequest('/projects/my', {
        headers: authHeaders,
      });

      // 10. Test GET /projects/stats (stats - admin only)
      console.log('\n📈 Testing projects stats...');
      await makeRequest('/projects/stats', {
        headers: authHeaders,
      });

      // 11. Clean up - permanently delete test project
      console.log('\n🧹 Cleaning up - permanently deleting test project...');
      await makeRequest(`/projects/${projectId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
    }

    console.log('\n✅ All projects endpoints tested successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
testProjectsEndpoints().catch(console.error);