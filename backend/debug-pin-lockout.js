// Debug script to test PIN lockout functionality
import { PinLockoutService } from './src/services/rate-limiter.js';

async function testPinLockout() {
  console.log('Testing PIN lockout functionality...');

  const userId = 'test-user-id';
  const deviceId = 'test-device-id';

  // Clear any existing lockouts
  PinLockoutService.clearAll();
  console.log('Cleared all lockouts');

  // Check initial status
  let status = PinLockoutService.getLockoutStatus(userId, deviceId);
  console.log('Initial status:', status);

  // Make 5 failed attempts
  for (let i = 1; i <= 5; i++) {
    console.log(`\nAttempt ${i}:`);
    const result = PinLockoutService.recordFailedAttempt(userId, deviceId);
    console.log('  Result:', result);

    status = PinLockoutService.getLockoutStatus(userId, deviceId);
    console.log('  Status:', status);
  }

  // Check if locked out
  const isLockedOut = PinLockoutService.isLockedOut(userId, deviceId);
  console.log('\nIs user locked out?', isLockedOut);

  // Try to clear failed attempts
  PinLockoutService.clearFailedAttempts(userId, deviceId);
  console.log('Cleared failed attempts');

  // Check status again
  status = PinLockoutService.getLockoutStatus(userId, deviceId);
  console.log('Status after clear:', status);
}

testPinLockout().catch(console.error);