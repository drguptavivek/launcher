const BASE_URL = 'http://localhost:3000';

async function testCreateAdminSecurity() {
  console.log('🚀 Starting Create-Admin Security Tests...');
  console.log('='.repeat(60));

  let testsPassed = 0;
  let testsTotal = 0;

  async function runTest(testName, testFunction) {
    testsTotal++;
    try {
      console.log(`\n🧪 Test: ${testName}`);
      await testFunction();
      testsPassed++;
      console.log('✅ PASSED');
    } catch (error) {
      console.log('❌ FAILED:', error.message);
    }
  }

  // Test 1: Unauthorized request
  await runTest('Unauthorized admin creation should be rejected', async () => {
    const response = await fetch(`${BASE_URL}/api/v1/web-admin/auth/create-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'hacker@evil.com',
        password: 'password123',
        firstName: 'Hacker',
        lastName: 'Evil',
        role: 'SYSTEM_ADMIN'
      })
    });

    const responseData = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(responseData)}`);

    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }
    if (responseData.ok !== false) {
      throw new Error('Expected ok: false in response');
    }
  });

  // Test 2: Invalid token
  await runTest('Invalid token should be rejected', async () => {
    const response = await fetch(`${BASE_URL}/api/v1/web-admin/auth/create-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid-token-here'
      },
      body: JSON.stringify({
        email: 'hacker2@evil.com',
        password: 'password123',
        firstName: 'Hacker2',
        lastName: 'Evil2',
        role: 'SYSTEM_ADMIN'
      })
    });

    const responseData = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(responseData)}`);

    if (response.status !== 401) {
      throw new Error(`Expected 401, got ${response.status}`);
    }
  });

  // Test 3: Missing required fields
  await runTest('Missing fields should still require auth first', async () => {
    const response = await fetch(`${BASE_URL}/api/v1/web-admin/auth/create-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@test.com'
        // Missing password, firstName, lastName
      })
    });

    const responseData = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(responseData)}`);

    if (response.status !== 401) {
      throw new Error(`Expected 401 (auth check before validation), got ${response.status}`);
    }
  });

  // Test 4: Verify server is responding
  await runTest('Server health check', async () => {
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();

    if (response.status !== 200) {
      throw new Error(`Health check failed: ${response.status}`);
    }
    if (data.status !== 'ok') {
      throw new Error('Health check response invalid');
    }
    console.log(`   Server status: ${data.status}`);
  });

  // Results
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Test Results: ${testsPassed}/${testsTotal} tests passed`);

  if (testsPassed === testsTotal) {
    console.log('🎉 ALL TESTS PASSED! The create-admin endpoint is properly secured.');
    console.log('✅ Authentication middleware is working correctly.');
    console.log('✅ Unauthorized users cannot create admin accounts.');
  } else {
    console.log('⚠️  SOME TESTS FAILED! Security issues detected.');
    console.log('❌ The create-admin endpoint may still be vulnerable.');
  }

  return testsPassed === testsTotal;
}

// Run tests
testCreateAdminSecurity().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});