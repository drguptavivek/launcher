import request from 'supertest';
import { app } from './src/app.js';
import { db } from './src/lib/db/index.js';
import { devices, users, userPins, teams } from './src/lib/db/schema.js';
import { eq } from 'drizzle-orm';

async function debugLogin() {
  try {
    console.log('🔍 Debugging concurrent login issue...');

    // Get existing test data
    const testUser = await db.select()
      .from(users)
      .where(eq(users.code, 'test001'))
      .limit(1);

    if (testUser.length === 0) {
      console.log('❌ Test user not found');
      return;
    }

    const userId = testUser[0].id;
    console.log(`✅ Found test user: ${userId}`);

    // Get existing devices for this user
    const existingDevices = await db.select()
      .from(devices)
      .where(eq(devices.teamId, testUser[0].teamId))
      .limit(5);

    console.log(`📱 Found ${existingDevices.length} existing devices`);
    existingDevices.forEach(d => console.log(`  - ${d.id}: ${d.name}`));

    // Test login with first device
    const deviceId1 = existingDevices[0]?.id;
    if (!deviceId1) {
      console.log('❌ No device found for testing');
      return;
    }

    console.log(`\n🔑 Testing login with device 1: ${deviceId1}`);
    const login1 = await request(app)
      .post('/api/v1/auth/login')
      .send({
        deviceId: deviceId1,
        userCode: 'test001',
        pin: '123456'
      });

    console.log(`Device 1 login result: ${login1.status}`);
    if (login1.status !== 200) {
      console.log('Error response:', login1.body);
    }

    // Test login with second device
    const deviceId2 = existingDevices[1]?.id;
    if (!deviceId2) {
      console.log('❌ No second device found');
      return;
    }

    console.log(`\n🔑 Testing login with device 2: ${deviceId2}`);
    const login2 = await request(app)
      .post('/api/v1/auth/login')
      .send({
        deviceId: deviceId2,
        userCode: 'test001',
        pin: '123456'
      });

    console.log(`Device 2 login result: ${login2.status}`);
    console.log('Error response:', login2.body);

  } catch (error) {
    console.error('Debug script error:', error);
  }
}

debugLogin().then(() => process.exit(0));