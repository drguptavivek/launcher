import { db } from '../lib/db';
import { devices, teams, policyIssues } from '../lib/db/schema';
import { policySigner } from '../lib/crypto';
import { logger } from '../lib/logger';
import { env } from '../lib/config';
import { eq, and, desc } from 'drizzle-orm';
import { generateJTI, nowUTC, getExpiryTimestamp, isWithinClockSkew } from '../lib/crypto';

export interface PolicyPayload {
  version: number;
  device_id: string;
  team_id: string;
  tz: string;
  time_anchor: {
    server_now_utc: string;
    max_clock_skew_sec: number;
    max_policy_age_sec: number;
  };
  session: {
    allowed_windows: Array<{
      days: string[];
      start: string;
      end: string;
    }>;
    grace_minutes: number;
    supervisor_override_minutes: number;
  };
  pin: {
    mode: 'server_verify' | 'local_verify';
    min_length: number;
    retry_limit: number;
    cooldown_seconds: number;
  };
  gps: {
    active_fix_interval_minutes: number;
    min_displacement_m: number;
    accuracy_threshold_m: number;
    max_age_minutes: number;
  };
  telemetry: {
    heartbeat_minutes: number;
    batch_max: number;
    retry_attempts: number;
    upload_interval_minutes: number;
  };
  ui: {
    blocked_message: string;
  };
  meta: {
    issued_at: string;
    expires_at: string;
  };
}

export interface PolicyIssueResult {
  success: boolean;
  jws?: string;
  payload?: PolicyPayload;
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Policy Service for policy issuance and management
 */
export class PolicyService {
  private static POLICY_VERSION = 3;
  private static POLICY_TTL_HOURS = 24; // Policies are valid for 24 hours
  private static policyCache = new Map<string, { payload: PolicyPayload; jws: string; expiresAt: Date }>();

  /**
   * Issue a signed policy for a device
   */
  static async issuePolicy(deviceId: string, ipAddress?: string): Promise<PolicyIssueResult> {
    try {
      // Validate device exists and is active
      const device = await db.select({
        id: devices.id,
        teamId: devices.teamId,
        name: devices.name,
      })
        .from(devices)
        .where(and(eq(devices.id, deviceId), eq(devices.isActive, true)))
        .limit(1);

      if (device.length === 0) {
        return {
          success: false,
          error: {
            code: 'DEVICE_NOT_FOUND',
            message: 'Device not found or inactive',
          },
        };
      }

      // Get team information
      const team = await db.select({
        id: teams.id,
        name: teams.name,
        timezone: teams.timezone,
      })
        .from(teams)
        .where(eq(teams.id, device[0].teamId))
        .limit(1);

      if (team.length === 0) {
        return {
          success: false,
          error: {
            code: 'TEAM_NOT_FOUND',
            message: 'Team not found',
          },
        };
      }

      const cachedPolicy = this.getCachedPolicy(deviceId);
      if (cachedPolicy) {
        await this.updateDeviceLastSeen(deviceId);
        return {
          success: true,
          jws: cachedPolicy.jws,
          payload: cachedPolicy.payload,
        };
      }

      // Create policy payload
      const payload = this.createPolicyPayload(deviceId, device[0].teamId, team[0].timezone);

      const validation = this.validatePolicyPayload(payload);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: 'POLICY_VALIDATION_FAILED',
            message: validation.errors.join('; ') || 'Policy payload validation failed',
          },
        };
      }

      // Sign the policy
      const jws = policySigner.createJWS(payload);

      // Record policy issuance
      const issueId = generateJTI();
      const expiresAt = getExpiryTimestamp(this.POLICY_TTL_HOURS * 60);

      await db.insert(policyIssues).values({
        id: issueId,
        deviceId,
        version: this.POLICY_VERSION.toString(),
        jwsKid: policySigner.getKeyId(),
        policyData: payload,
        issuedAt: nowUTC(),
        expiresAt,
        ipAddress,
      });

      this.cachePolicyPayload(deviceId, payload, jws);
      await this.updateDeviceLastSeen(deviceId);

      logger.info('Policy issued', {
        deviceId,
        teamId: device[0].teamId,
        policyVersion: this.POLICY_VERSION,
        issueId,
        ipAddress,
      });

      return {
        success: true,
        jws,
        payload,
      };
    } catch (error) {
      logger.error('Policy issuance error', {
        deviceId,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : error,
        errorMessage: String(error)
      });
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while issuing policy',
        },
      };
    }
  }

  /**
   * Create policy payload with team-specific settings
   */
  private static createPolicyPayload(deviceId: string, teamId: string, timezone: string): PolicyPayload {
    const now = nowUTC();
    const expiresAt = getExpiryTimestamp(this.POLICY_TTL_HOURS * 60);

    return {
      version: this.POLICY_VERSION,
      device_id: deviceId,
      team_id: teamId,
      tz: timezone,
      time_anchor: {
        server_now_utc: now.toISOString(),
        max_clock_skew_sec: env.MAX_CLOCK_SKEW_SEC,
        max_policy_age_sec: env.MAX_POLICY_AGE_SEC,
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
        mode: 'server_verify',
        min_length: 6,
        retry_limit: 5,
        cooldown_seconds: 300,
      },
      gps: {
        active_fix_interval_minutes: env.GPS_FIX_INTERVAL_MINUTES,
        min_displacement_m: 50,
        accuracy_threshold_m: env.GPS_ACCURACY_THRESHOLD_M,
        max_age_minutes: env.GPS_MAX_AGE_MINUTES,
      },
      telemetry: {
        heartbeat_minutes: env.HEARTBEAT_MINUTES,
        batch_max: env.TELEMETRY_BATCH_MAX,
        retry_attempts: env.TELEMETRY_RETRY_ATTEMPTS,
        upload_interval_minutes: env.TELEMETRY_UPLOAD_INTERVAL_MINUTES,
      },
      ui: {
        blocked_message: env.POLICY_UI_BLOCKED_MESSAGE,
      },
      meta: {
        issued_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      },
    };
  }

  /**
   * Get policy verification public key
   */
  static getPolicyPublicKey(): string {
    return policySigner.getPublicKey();
  }

  /**
   * Get recent policy issues for a device
   */
  static async getRecentPolicyIssues(deviceId: string, limit: number = 10): Promise<Array<{
    id: string;
    policyVersion: number;
    issuedAt: Date;
    expiresAt: Date;
    ipAddress?: string;
  }>> {
    const issues = await db.select({
      id: policyIssues.id,
      policyVersion: policyIssues.version,
      issuedAt: policyIssues.issuedAt,
      expiresAt: policyIssues.expiresAt,
      ipAddress: policyIssues.ipAddress,
    })
      .from(policyIssues)
      .where(eq(policyIssues.deviceId, deviceId))
      .orderBy(desc(policyIssues.issuedAt))
      .limit(limit);

    return issues.map(issue => ({
      ...issue,
      policyVersion: parseInt(issue.policyVersion ?? '0', 10) || 0,
    }));
  }

  /**
   * Clean up expired policy issues
   */
  static async cleanupExpiredPolicies(): Promise<number> {
    try {
      const now = nowUTC();

      // This would typically be done with a date comparison
      // For SQLite, we'd need to use raw SQL or adjust the approach
      // For now, this is a placeholder for the cleanup logic

      // In a real implementation, you might use:
      // await db.delete(policyIssues)
      //   .where(lt(policyIssues.expiresAt, now));

      logger.info('Policy cleanup completed');
      return 0; // Return number of cleaned policies
    } catch (error) {
      logger.error('Policy cleanup error', { error });
      return 0;
    }
  }

  /**
   * Get policy statistics
   */
  static async getPolicyStats(): Promise<{
    totalIssues: number;
    activePolicies: number;
    expiredPolicies: number;
    devicesWithPolicies: number;
  }> {
    try {
      // This would typically involve aggregation queries
      // For now, return placeholder data

      return {
        totalIssues: 0,
        activePolicies: 0,
        expiredPolicies: 0,
        devicesWithPolicies: 0,
      };
    } catch (error) {
      logger.error('Policy stats error', { error });
      return {
        totalIssues: 0,
        activePolicies: 0,
        expiredPolicies: 0,
        devicesWithPolicies: 0,
      };
    }
  }

  /**
   * Validate policy payload against current requirements
   */
  static validatePolicyPayload(payload: PolicyPayload): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check required fields
    if (!payload.version || typeof payload.version !== 'number') {
      errors.push('Invalid or missing version');
    }

    if (!payload.device_id || typeof payload.device_id !== 'string') {
      errors.push('Invalid or missing device_id');
    }

    if (!payload.team_id || typeof payload.team_id !== 'string') {
      errors.push('Invalid or missing team_id');
    }

    // Check time anchor
    if (!payload.time_anchor) {
      errors.push('Missing time_anchor');
    } else {
      const { max_clock_skew_sec, max_policy_age_sec } = payload.time_anchor;
      if (typeof max_clock_skew_sec !== 'number' || max_clock_skew_sec < 0) {
        errors.push('Invalid max_clock_skew_sec');
      }
      if (typeof max_policy_age_sec !== 'number' || max_policy_age_sec < 0) {
        errors.push('Invalid max_policy_age_sec');
      }
    }

    // Check session configuration
    if (!payload.session) {
      errors.push('Missing session configuration');
    } else {
      const { allowed_windows, grace_minutes, supervisor_override_minutes } = payload.session;
      if (!Array.isArray(allowed_windows)) {
        errors.push('Invalid allowed_windows');
      }
      if (typeof grace_minutes !== 'number' || grace_minutes < 0) {
        errors.push('Invalid grace_minutes');
      }
      if (typeof supervisor_override_minutes !== 'number' || supervisor_override_minutes < 0) {
        errors.push('Invalid supervisor_override_minutes');
      }
    }

    // Check pin configuration
    if (!payload.pin) {
      errors.push('Missing pin configuration');
    } else {
      const { mode, min_length, retry_limit, cooldown_seconds } = payload.pin;
      if (!['server_verify', 'local_verify'].includes(mode)) {
        errors.push('Invalid pin mode');
      }
      if (typeof min_length !== 'number' || min_length < 1) {
        errors.push('Invalid pin min_length');
      }
      if (typeof retry_limit !== 'number' || retry_limit < 1) {
        errors.push('Invalid pin retry_limit');
      }
      if (typeof cooldown_seconds !== 'number' || cooldown_seconds < 0) {
        errors.push('Invalid pin cooldown_seconds');
      }
    }

    if (!payload.gps) {
      errors.push('Missing gps configuration');
    } else {
      const { accuracy_threshold_m, max_age_minutes } = payload.gps;
      if (typeof accuracy_threshold_m !== 'number' || accuracy_threshold_m <= 0) {
        errors.push('Invalid gps.accuracy_threshold_m');
      }
      if (typeof max_age_minutes !== 'number' || max_age_minutes <= 0) {
        errors.push('Invalid gps.max_age_minutes');
      }
    }

    if (!payload.telemetry) {
      errors.push('Missing telemetry configuration');
    } else {
      const { retry_attempts, upload_interval_minutes } = payload.telemetry;
      if (typeof retry_attempts !== 'number' || retry_attempts < 0) {
        errors.push('Invalid telemetry.retry_attempts');
      }
      if (typeof upload_interval_minutes !== 'number' || upload_interval_minutes < 0) {
        errors.push('Invalid telemetry.upload_interval_minutes');
      }
    }

    if (!payload.ui) {
      errors.push('Missing ui configuration');
    } else if (typeof payload.ui.blocked_message !== 'string' || payload.ui.blocked_message.trim() === '') {
      errors.push('Invalid ui.blocked_message');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private static cachePolicyPayload(deviceId: string, payload: PolicyPayload, jws: string) {
    const expiresAt = new Date(payload.meta.expires_at);
    this.policyCache.set(deviceId, { payload, jws, expiresAt });
  }

  static getCachedPolicy(deviceId: string): { payload: PolicyPayload; jws: string } | null {
    const cached = this.policyCache.get(deviceId);
    if (!cached) return null;
    if (cached.expiresAt.getTime() <= nowUTC().getTime()) {
      this.policyCache.delete(deviceId);
      return null;
    }
    return { payload: cached.payload, jws: cached.jws };
  }

  /**
   * Invalidate cached policies. Used when policies are rotated or for tests.
   */
  static invalidatePolicyCache(deviceId?: string) {
    if (deviceId) {
      this.policyCache.delete(deviceId);
      return;
    }
    this.policyCache.clear();
  }

  private static async updateDeviceLastSeen(deviceId: string) {
    await db.update(devices)
      .set({
        lastSeenAt: nowUTC(),
        updatedAt: nowUTC(),
      })
      .where(eq(devices.id, deviceId));
  }
}
