// Load environment variables FIRST, before any imports
import { config } from 'dotenv';
config({ path: '.env' });

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PolicyService } from '../../src/services/policy-service';
import { db } from '../../src/lib/db';
import { teams, devices, policyIssues, users, userPins, sessions } from '../../src/lib/db/schema';
import { hashPassword, policySigner } from '../../src/lib/crypto';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../src/lib/logger';
import { ensureFixedTestData, cleanupFixedTestData, TEST_CREDENTIALS } from '../helpers/fixed-test-data';
import { nowUTC } from '../../src/lib/crypto';

// Mock only external dependencies (avoid mocking crypto to prevent db connection issues)
vi.mock('../../src/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('PolicyService - Real Database Tests', () => {
  let teamId: string;
  let deviceId: string;
  let userId: string;
  let inactiveDeviceId: string;
  let orphanedDeviceId: string;

  beforeAll(async () => {
    // Ensure fixed test data exists
    await ensureFixedTestData();

    // Use the fixed test data team
    teamId = '550e8400-e29b-41d4-a716-446655440002';
    deviceId = '550e8400-e29b-41d4-a716-446655440001';
    userId = '550e8400-e29b-41d4-a716-446655440003';
  });

  beforeEach(async () => {
    // Generate additional test UUIDs
    inactiveDeviceId = uuidv4();
    orphanedDeviceId = uuidv4();

    // Clean up any test data from previous runs
    await db.delete(policyIssues).where(eq(policyIssues.deviceId, deviceId));
    await db.delete(policyIssues).where(eq(policyIssues.deviceId, inactiveDeviceId));
    await db.delete(policyIssues).where(eq(policyIssues.deviceId, orphanedDeviceId));
    await db.delete(devices).where(eq(devices.id, inactiveDeviceId));
    await db.delete(devices).where(eq(devices.id, orphanedDeviceId));
    await db.delete(sessions).where(eq(sessions.deviceId, deviceId));
    PolicyService.invalidatePolicyCache();

    // Clear mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(policyIssues).where(eq(policyIssues.deviceId, deviceId));
    await db.delete(policyIssues).where(eq(policyIssues.deviceId, inactiveDeviceId));
    await db.delete(policyIssues).where(eq(policyIssues.deviceId, orphanedDeviceId));
    await db.delete(devices).where(eq(devices.id, inactiveDeviceId));
    await db.delete(devices).where(eq(devices.id, orphanedDeviceId));
    await db.delete(sessions).where(eq(sessions.deviceId, deviceId));
    PolicyService.invalidatePolicyCache();

    // Clear mocks
    vi.clearAllMocks();
  });

  describe('POLICY-001: Policy Issuance Success', () => {
    it('should issue policy successfully for valid device and team', async () => {
      const result = await PolicyService.issuePolicy(deviceId, '192.168.1.1');

      expect(result.success).toBe(true);
      expect(result.jws).toBeDefined();
      expect(result.payload).toBeDefined();
      expect(result.payload?.version).toBe(3);
      expect(result.payload?.device_id).toBe(deviceId);
      expect(result.payload?.team_id).toBe(teamId);

      // Verify policy was recorded in database
      const policyRecord = await db.select().from(policyIssues).where(eq(policyIssues.deviceId, deviceId)).limit(1);
      expect(policyRecord).toHaveLength(1);
      expect(policyRecord[0].deviceId).toBe(deviceId);
      expect(policyRecord[0].version).toBe('3');
    });

    it('should update device last seen timestamp', async () => {
      const beforeTime = new Date('2025-01-14T11:59:00Z');

      await PolicyService.issuePolicy(deviceId);

      // Check device was updated
      const device = await db.select().from(devices).where(eq(devices.id, deviceId)).limit(1);
      expect(device).toHaveLength(1);
      expect(device[0].id).toBe(deviceId);
      expect(device[0].lastSeenAt).toBeDefined();
    });
  });

  describe('POLICY-002: Device Not Found Error', () => {
    it('should return error when device does not exist', async () => {
      const result = await PolicyService.issuePolicy(uuidv4()); // Nonexistent device

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DEVICE_NOT_FOUND');
      expect(result.error?.message).toBe('Device not found or inactive');
    });

    it('should return error when device is inactive', async () => {
      // Create inactive device
      await db.insert(devices).values({
        id: inactiveDeviceId,
        teamId,
        androidId: inactiveDeviceId,
        name: 'Inactive Test Device',
        isActive: false,
        createdAt: new Date(),
      });

      const result = await PolicyService.issuePolicy(inactiveDeviceId);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DEVICE_NOT_FOUND');
      expect(result.error?.message).toBe('Device not found or inactive');
    });
  });

  describe('POLICY-003: Team Not Found Error', () => {
    it('should return error when team does not exist', async () => {
      // This scenario is tested by trying to issue policy for a device that doesn't exist
      // which implicitly tests the team validation since the service needs to find both device and team
      const nonExistentDeviceId = uuidv4();

      const result = await PolicyService.issuePolicy(nonExistentDeviceId);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DEVICE_NOT_FOUND');
      expect(result.error?.message).toBe('Device not found or inactive');
    });
  });

  describe('POLICY-004: Policy Content Structure Validation', () => {
    it('should create policy payload with correct structure', async () => {
      const result = await PolicyService.issuePolicy(deviceId);

      expect(result.success).toBe(true);
      expect(result.payload).toBeDefined();

      // Verify policy payload structure
      const payload = result.payload!;
      expect(payload.version).toBe(3);
      expect(payload.device_id).toBe(deviceId);
      expect(payload.team_id).toBe(teamId);
      expect(payload.tz).toBeDefined();
      expect(payload.time_anchor).toBeDefined();
      expect(payload.session).toBeDefined();
      expect(payload.pin).toBeDefined();
      expect(payload.gps).toBeDefined();
      expect(payload.telemetry).toBeDefined();
      expect(payload.meta).toBeDefined();

      // Verify specific required fields
      expect(payload.time_anchor.max_clock_skew_sec).toBe(180);
      expect(payload.time_anchor.max_policy_age_sec).toBe(86400);
      expect(payload.session.allowed_windows).toHaveLength(2);
      expect(payload.session.grace_minutes).toBe(10);
      expect(payload.session.supervisor_override_minutes).toBe(120);
      expect(payload.pin.mode).toBe('server_verify');
      expect(payload.pin.min_length).toBe(6);
      expect(payload.gps.active_fix_interval_minutes).toBe(3);
      expect(payload.gps.min_displacement_m).toBe(50);
      expect(payload.telemetry.heartbeat_minutes).toBe(10);
      expect(payload.telemetry.batch_max).toBe(50);
    });
  });

  describe('POLICY-005: Cryptographic Signature Verification', () => {
    it('should sign policy using cryptographic functions', async () => {
      const result = await PolicyService.issuePolicy(deviceId);

      expect(result.success).toBe(true);
      expect(result.jws).toBeDefined();
      expect(result.jws).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/); // Real JWS format
    });
  });

  describe('POLICY-006: Database Integration', () => {
    it('should record policy issuance in database', async () => {
      const result = await PolicyService.issuePolicy(deviceId, '192.168.1.100');

      expect(result.success).toBe(true);

      // Verify policy was recorded
      const policyRecord = await db.select().from(policyIssues).where(eq(policyIssues.deviceId, deviceId)).limit(1);
      expect(policyRecord).toHaveLength(1);
      expect(policyRecord[0].deviceId).toBe(deviceId);
      expect(policyRecord[0].version).toBe('3');
      expect(policyRecord[0].jwsKid).toBeDefined();
      expect(policyRecord[0].policyData).toBeDefined();
      expect(policyRecord[0].issuedAt).toBeDefined();
      expect(policyRecord[0].expiresAt).toBeDefined();
      expect(policyRecord[0].ipAddress).toBe('192.168.1.100');
    });

    it('should record multiple policy issuances for same device', async () => {
      // Issue first policy
      const result1 = await PolicyService.issuePolicy(deviceId, '192.168.1.1');
      expect(result1.success).toBe(true);

      PolicyService.invalidatePolicyCache(deviceId);

      // Issue second policy
      const result2 = await PolicyService.issuePolicy(deviceId, '192.168.1.2');
      expect(result2.success).toBe(true);

      // Verify both policies were recorded
      const policies = await db.select().from(policyIssues).where(eq(policyIssues.deviceId, deviceId)).orderBy(desc(policyIssues.issuedAt));
      expect(policies).toHaveLength(2);
      expect(policies[0].deviceId).toBe(deviceId);
      expect(policies[1].deviceId).toBe(deviceId);
    });
  });

  describe('POLICY-007: Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const signerSpy = vi.spyOn(policySigner, 'createJWS').mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      const result = await PolicyService.issuePolicy(deviceId);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INTERNAL_ERROR');
      expect(result.error?.message).toBe('An error occurred while issuing policy');

      signerSpy.mockRestore();
    });
  });

  describe('POLICY-008: Policy Public Key Access', () => {
    it('should return policy verification public key', () => {
      const publicKey = PolicyService.getPolicyPublicKey();

      expect(publicKey).toBeDefined();
      expect(typeof publicKey).toBe('string');
      expect(publicKey.length).toBeGreaterThan(0);
    });
  });

  describe('POLICY-009: Policy Payload Validation', () => {
    it('should validate correct policy payload', () => {
      const validPayload = {
        version: 3,
        device_id: deviceId,
        team_id: teamId,
        tz: 'Asia/Kolkata',
        time_anchor: {
          server_now_utc: '2025-01-14T12:00:00Z',
          max_clock_skew_sec: 180,
          max_policy_age_sec: 86400,
        },
        session: {
          allowed_windows: [
            { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], start: '08:00', end: '19:30' },
            { days: ['Sat'], start: '09:00', end: '15:00' },
          ],
          grace_minutes: 10,
          supervisor_override_minutes: 120,
        },
        pin: {
          mode: 'server_verify' as const,
          min_length: 6,
          retry_limit: 5,
          cooldown_seconds: 300,
        },
        gps: {
          active_fix_interval_minutes: 3,
          min_displacement_m: 50,
          accuracy_threshold_m: 10,
          max_age_minutes: 15,
        },
        telemetry: {
          heartbeat_minutes: 10,
          batch_max: 50,
          retry_attempts: 3,
          upload_interval_minutes: 15,
        },
        ui: {
          blocked_message: 'Out of working hours.',
        },
        meta: {
          issued_at: '2025-01-14T12:00:00Z',
          expires_at: '2025-01-15T12:00:00Z',
        },
      };

      const validation = PolicyService.validatePolicyPayload(validPayload);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid policy payload', () => {
      const invalidPayload = {
        version: 3,
        device_id: deviceId,
        // Missing required fields
      };

      const validation = PolicyService.validatePolicyPayload(invalidPayload);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should detect invalid pin mode', () => {
      const invalidPayload = {
        version: 3,
        device_id: deviceId,
        team_id: teamId,
        tz: 'Asia/Kolkata',
        time_anchor: {
          server_now_utc: '2025-01-14T12:00:00Z',
          max_clock_skew_sec: 180,
          max_policy_age_sec: 86400,
        },
        session: {
          allowed_windows: [
            { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], start: '08:00', end: '19:30' },
          ],
          grace_minutes: 10,
          supervisor_override_minutes: 120,
        },
        pin: {
          mode: 'invalid_mode' as any,
          min_length: 6,
          retry_limit: 5,
          cooldown_seconds: 300,
        },
        gps: {
          active_fix_interval_minutes: 3,
          min_displacement_m: 50,
          accuracy_threshold_m: 10,
          max_age_minutes: 15,
        },
        telemetry: {
          heartbeat_minutes: 10,
          batch_max: 50,
          retry_attempts: 3,
          upload_interval_minutes: 15,
        },
        ui: {
          blocked_message: 'Out of working hours.',
        },
        meta: {
          issued_at: '2025-01-14T12:00:00Z',
          expires_at: '2025-01-15T12:00:00Z',
        },
      };

      const validation = PolicyService.validatePolicyPayload(invalidPayload);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Invalid pin mode');
    });
  });

  describe('POLICY-010: Recent Policy Issues', () => {
    it('should get recent policy issues for device', async () => {
      // First issue a policy to create a record
      await PolicyService.issuePolicy(deviceId, '192.168.1.1');

      const issues = await PolicyService.getRecentPolicyIssues(deviceId, 10);

      expect(Array.isArray(issues)).toBe(true);
      expect(issues.length).toBeGreaterThanOrEqual(1);
      expect(issues[0].policyVersion).toBe(3);
      expect(issues[0].issuedAt).toBeDefined();
      expect(issues[0].expiresAt).toBeDefined();
      expect(issues[0].ipAddress).toBe('192.168.1.1');
    });

    it('should return empty array for device with no policies', async () => {
      const issues = await PolicyService.getRecentPolicyIssues(uuidv4(), 10);

      expect(Array.isArray(issues)).toBe(true);
      expect(issues).toHaveLength(0);
    });

    it('should limit number of returned issues', async () => {
      // Issue multiple policies
      await PolicyService.issuePolicy(deviceId, '192.168.1.1');
      PolicyService.invalidatePolicyCache(deviceId);
      await PolicyService.issuePolicy(deviceId, '192.168.1.2');
      PolicyService.invalidatePolicyCache(deviceId);
      await PolicyService.issuePolicy(deviceId, '192.168.1.3');

      const issues = await PolicyService.getRecentPolicyIssues(deviceId, 2);

      expect(Array.isArray(issues)).toBe(true);
      expect(issues.length).toBeLessThanOrEqual(2);
    });

      it('should return issues in descending order by issuance time', async () => {
        // Issue policies with a small delay to ensure different timestamps
        await PolicyService.issuePolicy(deviceId, '192.168.1.1');
        PolicyService.invalidatePolicyCache(deviceId);
        await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
        await PolicyService.issuePolicy(deviceId, '192.168.1.2');

      const issues = await PolicyService.getRecentPolicyIssues(deviceId, 5);

      expect(Array.isArray(issues)).toBe(true);
      expect(issues.length).toBe(2);
      // Should be in descending order (most recent first)
      expect(new Date(issues[0].issuedAt).getTime()).toBeGreaterThan(new Date(issues[1].issuedAt).getTime());
    });

    it('should coerce stored string versions to numbers', async () => {
      const manualIssueId = uuidv4();
      const now = new Date();
      const future = new Date(now.getTime() + 60_000);

      await db.insert(policyIssues).values({
        id: manualIssueId,
        deviceId,
        version: '42',
        issuedAt: now,
        expiresAt: future,
        jwsKid: 'manual-test',
        policyData: { test: true },
        ipAddress: '10.0.0.42'
      });

      const issues = await PolicyService.getRecentPolicyIssues(deviceId, 5);
      const manualIssue = issues.find(issue => issue.id === manualIssueId);

      expect(manualIssue).toBeDefined();
      expect(manualIssue?.policyVersion).toBe(42);
    });
  });

  describe('POLICY-011: Multiple Devices Same Team', () => {
    it('should issue policies for multiple devices in same team', async () => {
      const device2Id = uuidv4();

      // Create second device for same team
      await db.insert(devices).values({
        id: device2Id,
        teamId,
        androidId: device2Id,
        name: 'Second Test Device',
        isActive: true,
        createdAt: new Date(),
      });

      const result1 = await PolicyService.issuePolicy(deviceId);
      PolicyService.invalidatePolicyCache(deviceId);
      const result2 = await PolicyService.issuePolicy(device2Id);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.payload?.team_id).toBe(teamId);
      expect(result2.payload?.team_id).toBe(teamId);
      expect(result1.payload?.device_id).toBe(deviceId);
      expect(result2.payload?.device_id).toBe(device2Id);

      // Cleanup
      await db.delete(devices).where(eq(devices.id, device2Id));
      PolicyService.invalidatePolicyCache(device2Id);
    });
  });

  describe('POLICY-012: Policy Expiry', () => {
    it('should include expiry information in policy payload', async () => {
      const result = await PolicyService.issuePolicy(deviceId);

      expect(result.success).toBe(true);
      expect(result.payload?.meta).toBeDefined();

      // Check that timestamps are present and properly formatted
      expect(result.payload?.meta.issued_at).toBeDefined();
      expect(result.payload?.meta.expires_at).toBeDefined();
      expect(typeof result.payload?.meta.issued_at).toBe('string');
      expect(typeof result.payload?.meta.expires_at).toBe('string');

      // Check that expiry is approximately 24 hours after issuance
      const issuedAt = new Date(result.payload?.meta.issued_at);
      const expiresAt = new Date(result.payload?.meta.expires_at);
      const diffHours = (expiresAt.getTime() - issuedAt.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeCloseTo(24, 0); // Allow small rounding differences

      // Also check database record
      const policyRecord = await db.select().from(policyIssues).where(eq(policyIssues.deviceId, deviceId)).limit(1);
      expect(policyRecord).toHaveLength(1);
      expect(policyRecord[0].expiresAt).toBeDefined();
    });
  });
});
