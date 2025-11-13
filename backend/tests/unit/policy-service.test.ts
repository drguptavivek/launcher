import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PolicyService } from '../../src/services/policy-service';
import { v4 as uuidv4 } from 'uuid';

// Mock external dependencies
vi.mock('../../src/lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

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

describe('PolicyService', () => {
  let mockDbSelect: any;
  let mockDbInsert: any;
  let mockDbUpdate: any;
  let mockPolicySigner: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Get mock instances
    const { db } = vi.hoistedRequire('../../../src/lib/db');
    const { policySigner } = vi.hoistedRequire('../../../src/lib/crypto');

    mockDbSelect = vi.mocked(db.select);
    mockDbInsert = vi.mocked(db.insert);
    mockDbUpdate = vi.mocked(db.update);
    mockPolicySigner = vi.mocked(policySigner);

    // Setup default successful responses
    mockPolicySigner.createJWS.mockReturnValue('eyJhbGciOiJFZERTQSJ9.eyJ2ZXJzaW9uIjozLCJkZXZpY2VfaWQiOiJkZXZpY2UtMDAxIiwidGVhbV9pZCI6InRlYW0tMDAxIn0.signature');
    mockPolicySigner.getKeyId.mockReturnValue('policy-key-001');
  });

  describe('POLICY-001: Policy Issuance Success', () => {
    it('should issue policy successfully for valid device and team', async () => {
      // Arrange
      const deviceId = uuidv4();
      const teamId = uuidv4();
      const mockDevice = [{ id: deviceId, teamId, name: 'Test Device' }];
      const mockTeam = [{ id: teamId, name: 'Test Team', timezone: 'Asia/Kolkata' }];

      // Mock device query
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockDevice),
          }),
        }),
      } as any);

      // Mock team query
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockTeam),
          }),
        }),
      } as any);

      // Mock insert and update
      mockDbInsert.mockReturnValueOnce({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      mockDbUpdate.mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      // Act
      const result = await PolicyService.issuePolicy(deviceId, '192.168.1.100');

      // Assert
      expect(result.success).toBe(true);
      expect(result.jws).toBe('eyJhbGciOiJFZERTQSJ9.eyJ2ZXJzaW9uIjozLCJkZXZpY2VfaWQiOiJkZXZpY2UtMDAxIiwidGVhbV9pZCI6InRlYW0tMDAxIn0.signature');
      expect(result.payload).toBeDefined();
      expect(result.error).toBeUndefined();

      // Verify payload structure
      const payload = result.payload!;
      expect(payload.version).toBe(3);
      expect(payload.device_id).toBe(deviceId);
      expect(payload.team_id).toBe(teamId);
      expect(payload.tz).toBe('Asia/Kolkata');

      // Verify time_anchor structure
      expect(payload.time_anchor).toEqual({
        server_now_utc: expect.any(String),
        max_clock_skew_sec: 180,
        max_policy_age_sec: 86400,
      });

      // Verify session structure
      expect(payload.session).toEqual({
        allowed_windows: [
          { days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], start: '08:00', end: '19:30' },
          { days: ['Sat'], start: '09:00', end: '15:00' },
        ],
        grace_minutes: 10,
        supervisor_override_minutes: 120,
      });

      // Verify PIN structure
      expect(payload.pin).toEqual({
        mode: 'server_verify',
        min_length: 6,
        retry_limit: 5,
        cooldown_seconds: 300,
      });

      // Verify GPS structure
      expect(payload.gps).toEqual({
        active_fix_interval_minutes: 3,
        min_displacement_m: 50,
      });

      // Verify telemetry structure
      expect(payload.telemetry).toEqual({
        heartbeat_minutes: 10,
        batch_max: 50,
      });

      // Verify meta structure
      expect(payload.meta).toEqual({
        issued_at: expect.any(String),
        expires_at: expect.any(String),
      });

      // Verify calls
      expect(mockDbSelect).toHaveBeenCalledTimes(2);
      expect(mockPolicySigner.createJWS).toHaveBeenCalledTimes(1);
      expect(mockDbInsert).toHaveBeenCalledTimes(1);
      expect(mockDbUpdate).toHaveBeenCalledTimes(1);

      // Verify logging
      const { logger } = require('../../src/lib/logger');
      expect(logger.info).toHaveBeenCalledWith('Policy issued', expect.objectContaining({
        deviceId,
        teamId,
        policyVersion: 3,
        issueId: 'test-jti-001',
        ipAddress: '192.168.1.100',
      }));
    });
  });

  describe('POLICY-002: Device Not Found Error', () => {
    it('should return error when device does not exist', async () => {
      // Arrange
      const deviceId = uuidv4();
      const mockDevice: any[] = [];

      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockDevice),
          }),
        }),
      } as any);

      // Act
      const result = await PolicyService.issuePolicy(deviceId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.jws).toBeUndefined();
      expect(result.payload).toBeUndefined();
      expect(result.error).toEqual({
        code: 'DEVICE_NOT_FOUND',
        message: 'Device not found or inactive',
      });

      // Verify no further calls
      expect(mockPolicySigner.createJWS).not.toHaveBeenCalled();
      expect(mockDbInsert).not.toHaveBeenCalled();
    });

    it('should return error when device is inactive', async () => {
      // Arrange
      const deviceId = uuidv4();
      const teamId = uuidv4();
      const mockDevice = [{ id: deviceId, teamId, name: 'Test Device', isActive: false }];

      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockDevice),
          }),
        }),
      } as any);

      // Act
      const result = await PolicyService.issuePolicy(deviceId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toEqual({
        code: 'DEVICE_NOT_FOUND',
        message: 'Device not found or inactive',
      });
    });
  });

  describe('POLICY-003: Team Not Found Error', () => {
    it('should return error when team does not exist', async () => {
      // Arrange
      const deviceId = uuidv4();
      const teamId = uuidv4();
      const mockDevice = [{ id: deviceId, teamId, name: 'Test Device' }];
      const mockTeam: any[] = [];

      // Mock device query (success)
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockDevice),
          }),
        }),
      } as any);

      // Mock team query (empty result)
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockTeam),
          }),
        }),
      } as any);

      // Act
      const result = await PolicyService.issuePolicy(deviceId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toEqual({
        code: 'TEAM_NOT_FOUND',
        message: 'Team not found',
      });

      // Verify no policy issuance calls
      expect(mockPolicySigner.createJWS).not.toHaveBeenCalled();
      expect(mockDbInsert).not.toHaveBeenCalled();
    });
  });

  describe('POLICY-004: Policy Content Structure Validation', () => {
    it('should create policy payload with correct structure', async () => {
      // Arrange
      const deviceId = uuidv4();
      const teamId = uuidv4();
      const timezone = 'Asia/Kolkata';
      const mockDevice = [{ id: deviceId, teamId, name: 'Test Device' }];
      const mockTeam = [{ id: teamId, name: 'Test Team', timezone }];

      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockDevice),
          }),
        }),
      } as any);

      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockTeam),
          }),
        }),
      } as any);

      mockDbInsert.mockReturnValueOnce({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      mockDbUpdate.mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      // Act
      const result = await PolicyService.issuePolicy(deviceId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.payload).toBeDefined();

      const payload = result.payload!;
      expect(payload.version).toBe(3);
      expect(payload.device_id).toBe(deviceId);
      expect(payload.team_id).toBe(teamId);
      expect(payload.tz).toBe(timezone);

      // Validate required fields exist
      expect(payload.time_anchor).toBeDefined();
      expect(payload.session).toBeDefined();
      expect(payload.pin).toBeDefined();
      expect(payload.gps).toBeDefined();
      expect(payload.telemetry).toBeDefined();
      expect(payload.meta).toBeDefined();

      // Validate meta timestamps
      const issuedAt = new Date(payload.meta.issued_at);
      const expiresAt = new Date(payload.meta.expires_at);
      expect(issuedAt).toBeInstanceOf(Date);
      expect(expiresAt).toBeInstanceOf(Date);
      expect(expiresAt.getTime()).toBeGreaterThan(issuedAt.getTime());
    });
  });

  describe('POLICY-005: Cryptographic Signature Verification', () => {
    it('should sign policy using cryptographic functions', async () => {
      // Arrange
      const deviceId = uuidv4();
      const teamId = uuidv4();
      const mockDevice = [{ id: deviceId, teamId, name: 'Test Device' }];
      const mockTeam = [{ id: teamId, name: 'Test Team', timezone: 'UTC' }];
      const mockJWS = 'eyJhbGciOiJFZERTQSJ9.eyJ2ZXJzaW9uIjozLCJkZXZpY2VfaWQiOiJkZXZpY2UtMDAxIiwidGVhbV9pZCI6InRlYW0tMDAxIn0.signature';

      mockPolicySigner.createJWS.mockReturnValue(mockJWS);

      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockDevice),
          }),
        }),
      } as any);

      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockTeam),
          }),
        }),
      } as any);

      mockDbInsert.mockReturnValueOnce({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      mockDbUpdate.mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      // Act
      const result = await PolicyService.issuePolicy(deviceId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.jws).toBe(mockJWS);

      // Verify cryptographic functions were called
      expect(mockPolicySigner.createJWS).toHaveBeenCalledWith(
        expect.objectContaining({
          version: 3,
          device_id: deviceId,
          team_id: teamId,
        })
      );
      expect(mockPolicySigner.getKeyId).toHaveBeenCalled();
    });
  });

  describe('POLICY-006: Database Integration', () => {
    it('should record policy issuance in database', async () => {
      // Arrange
      const deviceId = uuidv4();
      const teamId = uuidv4();
      const ipAddress = '192.168.1.100';
      const mockDevice = [{ id: deviceId, teamId, name: 'Test Device' }];
      const mockTeam = [{ id: teamId, name: 'Test Team', timezone: 'UTC' }];
      const mockInsertValues = vi.fn().mockResolvedValue(undefined);

      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockDevice),
          }),
        }),
      } as any);

      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockTeam),
          }),
        }),
      } as any);

      mockDbInsert.mockReturnValueOnce({
        values: mockInsertValues,
      } as any);

      mockDbUpdate.mockReturnValueOnce({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      // Act
      await PolicyService.issuePolicy(deviceId, ipAddress);

      // Assert
      expect(mockDbInsert).toHaveBeenCalled();
      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId,
          version: '3',
          jwsKid: 'policy-key-001',
          policyData: expect.any(Object),
          issuedAt: new Date('2025-01-14T12:00:00Z'),
          expiresAt: new Date('2025-01-15T12:00:00Z'),
          ipAddress,
        })
      );
    });

    it('should update device last seen timestamp', async () => {
      // Arrange
      const deviceId = uuidv4();
      const teamId = uuidv4();
      const mockDevice = [{ id: deviceId, teamId, name: 'Test Device' }];
      const mockTeam = [{ id: teamId, name: 'Test Team', timezone: 'UTC' }];
      const mockSetValues = vi.fn().mockResolvedValue(undefined);

      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockDevice),
          }),
        }),
      } as any);

      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockTeam),
          }),
        }),
      } as any);

      mockDbInsert.mockReturnValueOnce({
        values: vi.fn().mockResolvedValue(undefined),
      } as any);

      mockDbUpdate.mockReturnValueOnce({
        set: mockSetValues,
      } as any);

      // Act
      await PolicyService.issuePolicy(deviceId);

      // Assert
      expect(mockDbUpdate).toHaveBeenCalled();
      expect(mockSetValues).toHaveBeenCalledWith({
        lastSeenAt: new Date('2025-01-14T12:00:00Z'),
        updatedAt: new Date('2025-01-14T12:00:00Z'),
      });
    });
  });

  describe('POLICY-007: Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      const deviceId = uuidv4();
      const dbError = new Error('Database connection failed');

      mockDbSelect.mockImplementation(() => {
        throw dbError;
      });

      // Act
      const result = await PolicyService.issuePolicy(deviceId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toEqual({
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while issuing policy',
      });

      const { logger } = require('../../src/lib/logger');
      expect(logger.error).toHaveBeenCalledWith(
        'Policy issuance error',
        expect.objectContaining({
          deviceId,
          error: expect.objectContaining({
            message: dbError.message,
            name: dbError.name,
          }),
        })
      );
    });

    it('should handle policy signing errors', async () => {
      // Arrange
      const deviceId = uuidv4();
      const teamId = uuidv4();
      const mockDevice = [{ id: deviceId, teamId, name: 'Test Device' }];
      const mockTeam = [{ id: teamId, name: 'Test Team', timezone: 'UTC' }];
      const signingError = new Error('Signing key not available');

      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockDevice),
          }),
        }),
      } as any);

      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(mockTeam),
          }),
        }),
      } as any);

      mockPolicySigner.createJWS.mockImplementation(() => {
        throw signingError;
      });

      // Act
      const result = await PolicyService.issuePolicy(deviceId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toEqual({
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while issuing policy',
      });

      const { logger } = require('../../src/lib/logger');
      expect(logger.error).toHaveBeenCalledWith(
        'Policy issuance error',
        expect.objectContaining({
          deviceId,
          error: expect.objectContaining({
            message: signingError.message,
          }),
        })
      );
    });
  });

  describe('POLICY-010: Policy Public Key Access', () => {
    it('should return policy verification public key', async () => {
      // Act
      const publicKey = PolicyService.getPolicyPublicKey();

      // Assert
      expect(publicKey).toBe('policy-key-001');

      // Verify key ID retrieval
      expect(mockPolicySigner.getPublicKey).toHaveBeenCalled();
    });
  });

  describe('POLICY-011: Policy Payload Validation', () => {
    it('should validate correct policy payload', () => {
      // Arrange
      const validPayload = {
        version: 3,
        device_id: uuidv4(),
        team_id: uuidv4(),
        tz: 'Asia/Kolkata',
        time_anchor: {
          server_now_utc: new Date().toISOString(),
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
          mode: 'server_verify' as const,
          min_length: 6,
          retry_limit: 5,
          cooldown_seconds: 300,
        },
        gps: {
          active_fix_interval_minutes: 3,
          min_displacement_m: 50,
        },
        telemetry: {
          heartbeat_minutes: 10,
          batch_max: 50,
        },
        meta: {
          issued_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      };

      // Act
      const result = PolicyService.validatePolicyPayload(validPayload);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid policy payload', () => {
      // Arrange
      const invalidPayload = {
        version: -1, // Invalid version
        device_id: '', // Missing device ID
        time_anchor: {
          max_clock_skew_sec: -1, // Invalid value
          max_policy_age_sec: -1, // Invalid value
        },
        session: {
          allowed_windows: 'not-array' as any, // Invalid type
          grace_minutes: -1, // Invalid value
          supervisor_override_minutes: -1, // Invalid value
        },
        pin: {
          mode: 'invalid-mode' as any, // Invalid mode
          min_length: 0, // Invalid value
          retry_limit: 0, // Invalid value
          cooldown_seconds: -1, // Invalid value
        },
      };

      // Act
      const result = PolicyService.validatePolicyPayload(invalidPayload);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      // Check for specific validation errors
      expect(result.errors).toContain('Invalid or missing version');
      expect(result.errors).toContain('Invalid or missing device_id');
      expect(result.errors).toContain('Invalid max_clock_skew_sec');
      expect(result.errors).toContain('Invalid max_policy_age_sec');
      expect(result.errors).toContain('Invalid allowed_windows');
      expect(result.errors).toContain('Invalid grace_minutes');
      expect(result.errors).toContain('Invalid supervisor_override_minutes');
      expect(result.errors).toContain('Invalid pin mode');
      expect(result.errors).toContain('Invalid pin min_length');
      expect(result.errors).toContain('Invalid pin retry_limit');
      expect(result.errors).toContain('Invalid pin cooldown_seconds');
    });
  });

  describe('Recent Policy Issues', () => {
    it('should get recent policy issues for device', async () => {
      // Arrange
      const deviceId = uuidv4();
      const mockIssues = [
        {
          id: uuidv4(),
          policyVersion: 3,
          issuedAt: new Date('2025-01-14T10:00:00Z'),
          expiresAt: new Date('2025-01-15T10:00:00Z'),
          ipAddress: '192.168.1.100',
        },
        {
          id: uuidv4(),
          policyVersion: 3,
          issuedAt: new Date('2025-01-14T08:00:00Z'),
          expiresAt: new Date('2025-01-15T08:00:00Z'),
          ipAddress: '192.168.1.100',
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockIssues),
            }),
          }),
        }),
      });

      mockDbSelect.mockImplementation((columns) => mockSelect(columns));

      // Act
      const issues = await PolicyService.getRecentPolicyIssues(deviceId, 10);

      // Assert
      expect(issues).toHaveLength(2);
      expect(issues[0]).toEqual(mockIssues[0]);
      expect(issues[1]).toEqual(mockIssues[1]);

      expect(mockDbSelect).toHaveBeenCalled();
      expect(mockSelect).toHaveBeenCalled();
    });

    it('should return empty array for device with no policies', async () => {
      // Arrange
      const deviceId = uuidv4();
      const mockIssues: any[] = [];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockIssues),
            }),
          }),
        }),
      });

      mockDbSelect.mockImplementation((columns) => mockSelect(columns));

      // Act
      const issues = await PolicyService.getRecentPolicyIssues(deviceId);

      // Assert
      expect(issues).toHaveLength(0);
    });
  });
});