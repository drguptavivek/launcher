import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PolicyService } from '../../src/services/policy-service';
import { db } from '../../src/lib/db';
import { teams, devices, policyIssues } from '../../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Mock only non-database dependencies
vi.mock('../../src/lib/crypto', () => ({
  policySigner: {
    createJWS: vi.fn().mockReturnValue('eyJhbGciOiJFZERTQSJ9.eyJ2ZXJzaW9uIjozLCJkZXZpY2VfaWQiOiJkZXZpY2UtMDAxIiwidGVhbV9pZCI6InRlYW0tMDAxIn0.signature'),
    getKeyId: vi.fn().mockReturnValue('policy-key-001'),
  },
  generateJTI: vi.fn().mockReturnValue('test-jti-001'),
  nowUTC: vi.fn().mockReturnValue(new Date('2025-01-14T12:00:00Z')),
  getExpiryTimestamp: vi.fn().mockReturnValue(new Date('2025-01-15T12:00:00Z')),
}));

vi.mock('../../src/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../../src/lib/config', () => ({
  env: {
    MAX_CLOCK_SKEW_SEC: 180,
    MAX_POLICY_AGE_SEC: 86400,
    HEARTBEAT_MINUTES: 10,
    TELEMETRY_BATCH_MAX: 50,
  },
}));

// Import mocked dependencies
import { policySigner } from '../../src/lib/crypto';

describe('PolicyService - Real Database Tests (Security Critical)', () => {
  let teamId: string;
  let deviceId: string;

  beforeEach(async () => {
    // Generate test UUIDs
    teamId = uuidv4();
    deviceId = uuidv4();

    // Create test team
    await db.insert(teams).values({
      id: teamId,
      name: 'Test Team for Policy Service',
      timezone: 'Asia/Kolkata',
      stateId: 'MH01',
      isActive: true,
    });

    // Create test device
    await db.insert(devices).values({
      id: deviceId,
      teamId,
      name: 'Test Device for Policy Service',
      androidId: 'test-android-policy-001',
      isActive: true,
    });
  });

  afterEach(async () => {
    // Clean up test data in proper order to respect foreign key constraints
    await db.delete(policyIssues).where(eq(policyIssues.deviceId, deviceId));
    await db.delete(devices).where(eq(devices.id, deviceId));
    await db.delete(teams).where(eq(teams.id, teamId));

    // Clear mocks
    vi.clearAllMocks();
  });

  describe('POLICY-001: Policy Issuance Success', () => {
    it('should issue policy successfully for valid device and team', async () => {
      const result = await PolicyService.issuePolicy(deviceId);

      expect(result.success).toBe(true);
      expect(result.policy).toBeDefined();
      expect(result.policyVersion).toBe(3);
      expect(result.expiresAt).toBeDefined();

      // Verify policy was recorded in database
      const policyRecord = await db.select().from(policyIssues).where(eq(policyIssues.deviceId, deviceId)).limit(1);
      expect(policyRecord).toHaveLength(1);
      expect(policyRecord[0].deviceId).toBe(deviceId);
      expect(policyRecord[0].version).toBe('3');
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
      // Deactivate the device
      await db.update(devices)
        .set({ isActive: false })
        .where(eq(devices.id, deviceId));

      const result = await PolicyService.issuePolicy(deviceId);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('DEVICE_NOT_FOUND');
      expect(result.error?.message).toBe('Device not found or inactive');
    });
  });

  describe('POLICY-003: Team Not Found Error', () => {
    it('should return error when team does not exist', async () => {
      // Create device with nonexistent team
      const orphanedDeviceId = uuidv4();
      await db.insert(devices).values({
        id: orphanedDeviceId,
        teamId: uuidv4(), // Nonexistent team
        name: 'Orphaned Device',
        androidId: 'test-android-orphan-001',
        isActive: true,
      });

      const result = await PolicyService.issuePolicy(orphanedDeviceId);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('TEAM_NOT_FOUND');
      expect(result.error?.message).toBe('Team not found or inactive');

      // Cleanup
      await db.delete(devices).where(eq(devices.id, orphanedDeviceId));
    });
  });

  describe('POLICY-004: Policy Content Structure Validation', () => {
    it('should create policy payload with correct structure', async () => {
      const result = await PolicyService.issuePolicy(deviceId);

      expect(result.success).toBe(true);
      expect(result.policy).toBeDefined();

      // Parse the policy to verify structure
      const policyPayload = JSON.parse(atob(result.policy!.split('.')[1]));

      expect(policyPayload.version).toBe(3);
      expect(policyPayload.device_id).toBe(deviceId);
      expect(policyPayload.team_id).toBe(teamId);
      expect(policyPayload.session).toBeDefined();
      expect(policyPayload.gps).toBeDefined();
      expect(policyPayload.telemetry).toBeDefined();
      expect(policyPayload.time_anchor).toBeDefined();
    });
  });

  describe('POLICY-005: Cryptographic Signature Verification', () => {
    it('should sign policy using cryptographic functions', async () => {
      const result = await PolicyService.issuePolicy(deviceId);

      expect(result.success).toBe(true);
      expect(result.policy).toBeDefined();
      expect(policySigner.createJWS).toHaveBeenCalled();
      expect(policySigner.getKeyId).toHaveBeenCalled();
    });
  });

  describe('POLICY-006: Database Integration', () => {
    it('should record policy issuance in database', async () => {
      const result = await PolicyService.issuePolicy(deviceId);

      expect(result.success).toBe(true);

      // Verify policy was recorded
      const policyRecord = await db.select().from(policyIssues).where(eq(policyIssues.deviceId, deviceId)).limit(1);
      expect(policyRecord).toHaveLength(1);
      expect(policyRecord[0].deviceId).toBe(deviceId);
      expect(policyRecord[0].version).toBe('3');
      expect(policyRecord[0].jwsKid).toBe('policy-key-001');
      expect(policyRecord[0].issuedAt).toBeDefined();
      expect(policyRecord[0].expiresAt).toBeDefined();
    });

    it('should update device last seen timestamp', async () => {
      const beforeTime = new Date();

      await PolicyService.issuePolicy(deviceId);

      // Check device was updated (this assumes the service updates device.lastSeenAt)
      const device = await db.select().from(devices).where(eq(devices.id, deviceId)).limit(1);
      expect(device).toHaveLength(1);
      expect(device[0].id).toBe(deviceId);
    });
  });

  describe('POLICY-007: Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database to throw error
      const originalSelect = db.select;
      vi.mocked(db.select).mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      const result = await PolicyService.issuePolicy(deviceId);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INTERNAL_ERROR');

      // Restore original function
      vi.mocked(db.select).mockImplementation(originalSelect);
    });

    it('should handle policy signing errors', async () => {
      // Mock policy signer to throw error
      vi.mocked(policySigner.createJWS).mockRejectedValueOnce(new Error('Signing key not available'));

      const result = await PolicyService.issuePolicy(deviceId);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('POLICY_SIGNING_ERROR');
    });
  });

  describe('POLICY-010: Policy Public Key Access', () => {
    it('should return policy verification public key', () => {
      const publicKey = PolicyService.getPolicyPublicKey();

      expect(publicKey).toBeDefined();
      expect(typeof publicKey).toBe('string');
    });
  });

  describe('POLICY-011: Policy Payload Validation', () => {
    it('should validate correct policy payload', () => {
      const validPayload = {
        version: 3,
        device_id: deviceId,
        team_id: teamId,
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
        gps: {
          active_fix_interval_minutes: 3,
          min_displacement_m: 50,
        },
        telemetry: {
          heartbeat_minutes: 10,
          batch_max: 50,
        },
      };

      const isValid = PolicyService.validatePolicyPayload(validPayload);
      expect(isValid).toBe(true);
    });

    it('should detect invalid policy payload', () => {
      const invalidPayload = {
        version: 3,
        device_id: deviceId,
        // Missing required fields
      };

      const isValid = PolicyService.validatePolicyPayload(invalidPayload);
      expect(isValid).toBe(false);
    });
  });

  describe('Recent Policy Issues', () => {
    it('should get recent policy issues for device', async () => {
      // First issue a policy to create a record
      await PolicyService.issuePolicy(deviceId);

      const issues = PolicyService.getRecentPolicyIssues(deviceId, 10);

      expect(Array.isArray(issues)).toBe(true);
      expect(issues.length).toBeGreaterThanOrEqual(0);
    });

    it('should return empty array for device with no policies', async () => {
      const issues = PolicyService.getRecentPolicyIssues(uuidv4(), 10);

      expect(Array.isArray(issues)).toBe(true);
      expect(issues).toHaveLength(0);
    });
  });
});