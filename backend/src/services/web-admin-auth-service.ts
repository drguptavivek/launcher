import { db } from '../lib/db';
import { webAdminUsers } from '../lib/db/schema';
import { verifyPassword, hashPassword } from '../lib/crypto';
import { JWTService } from './jwt-service';
import { logger } from '../lib/logger';
import { eq, and, sql } from 'drizzle-orm';
import { nowUTC, getExpiryTimestamp, generateJTI } from '../lib/crypto';
import { v4 as uuidv4 } from 'uuid';

export interface WebAdminLoginRequest {
  email: string;
  password: string;
}

export interface WebAdminLoginResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    fullName: string;
  };
  accessToken?: string;
  refreshToken?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface WebAdminWhoAmIResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    fullName: string;
    lastLoginAt?: Date;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface CreateWebAdminUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
}

// Valid roles for web admin access (excluding TEAM_MEMBER)
export const VALID_WEB_ADMIN_ROLES = [
  'SYSTEM_ADMIN',
  'SUPPORT_AGENT',
  'AUDITOR',
  'DEVICE_MANAGER',
  'POLICY_ADMIN',
  'NATIONAL_SUPPORT_ADMIN',
  // Hybrid roles that can access both app and web
  'FIELD_SUPERVISOR',
  'REGIONAL_MANAGER'
];

export interface UpdateWebAdminUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  password?: string;
}

export class WebAdminAuthService {
  constructor() {
    // No JWTService instance needed - using static methods
  }

  /**
   * Authenticate web admin user with email and password
   */
  async login(credentials: WebAdminLoginRequest): Promise<WebAdminLoginResult> {
    const { email, password } = credentials;

    try {
      // Find admin user by email
      const adminUsers = await db
        .select()
        .from(webAdminUsers)
        .where(eq(webAdminUsers.email, email))
        .limit(1);

      if (adminUsers.length === 0) {
        await this.logFailedLogin(email, 'USER_NOT_FOUND');
        return {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        };
      }

      const adminUser = adminUsers[0];

      // Check if account is locked
      if (adminUser.lockedAt && adminUser.lockedAt > new Date()) {
        return {
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: 'Account is temporarily locked due to multiple failed login attempts'
          }
        };
      }

      // Check if account is active
      if (!adminUser.isActive) {
        await this.logFailedLogin(email, 'INACTIVE_USER');
        return {
          success: false,
          error: {
            code: 'ACCOUNT_INACTIVE',
            message: 'Account is inactive'
          }
        };
      }

      // Role validation: TEAM_MEMBER role cannot access web admin interface
      if (adminUser.role === 'TEAM_MEMBER') {
        await this.logFailedLogin(email, 'WEB_ACCESS_DENIED');
        return {
          success: false,
          error: {
            code: 'WEB_ACCESS_DENIED',
            message: 'TEAM_MEMBER role cannot access web admin interface'
          }
        };
      }

      // Verify password
      const [storedHash, storedSalt] = adminUser.password.split(':');
      const passwordValid = await verifyPassword(password, storedHash, storedSalt);
      if (!passwordValid) {
        await this.handleFailedLogin(adminUser.id);
        return {
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        };
      }

      // Reset login attempts on successful login
      await this.resetLoginAttempts(adminUser.id);

      // Update last login
      await db
        .update(webAdminUsers)
        .set({
          lastLoginAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(webAdminUsers.id, adminUser.id));

      // Generate JWT tokens using JWTService
      const webAdminSessionId = uuidv4(); // Create session ID for web admin
      const webAdminDeviceId = `web-admin-${adminUser.id}`; // Virtual device ID for web admin

      const accessTokenResult = await JWTService.createToken({
        userId: adminUser.id,
        deviceId: webAdminDeviceId,
        sessionId: webAdminSessionId,
        type: 'web-admin'
      });

      const refreshTokenResult = await JWTService.createToken({
        userId: adminUser.id,
        deviceId: webAdminDeviceId,
        sessionId: webAdminSessionId,
        type: 'refresh'
      });

      // Log successful login
      const now = new Date();
      logger.info('web_admin_login_success', {
        adminId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        timestamp: now
      });

      return {
        success: true,
        user: {
          id: adminUser.id,
          email: adminUser.email,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          role: adminUser.role,
          fullName: `${adminUser.firstName} ${adminUser.lastName}`
        },
        accessToken: accessTokenResult.token,
        refreshToken: refreshTokenResult.token
      };

    } catch (error: any) {
      logger.error('web_admin_login_error', {
        email,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      };
    }
  }

  /**
   * Get web admin user information from JWT token
   */
  async whoami(adminId: string): Promise<WebAdminWhoAmIResult> {
    try {
      const adminUsers = await db
        .select({
          id: webAdminUsers.id,
          email: webAdminUsers.email,
          firstName: webAdminUsers.firstName,
          lastName: webAdminUsers.lastName,
          role: webAdminUsers.role,
          isActive: webAdminUsers.isActive,
          lastLoginAt: webAdminUsers.lastLoginAt
        })
        .from(webAdminUsers)
        .where(eq(webAdminUsers.id, adminId))
        .limit(1);

      if (adminUsers.length === 0) {
        return {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'Web admin user not found'
          }
        };
      }

      const adminUser = adminUsers[0];

      if (!adminUser.isActive) {
        return {
          success: false,
          error: {
            code: 'ACCOUNT_INACTIVE',
            message: 'Account is inactive'
          }
        };
      }

      // Role validation: TEAM_MEMBER role should not have web admin access
      if (adminUser.role === 'TEAM_MEMBER') {
        return {
          success: false,
          error: {
            code: 'WEB_ACCESS_DENIED',
            message: 'TEAM_MEMBER role cannot access web admin interface'
          }
        };
      }

      return {
        success: true,
        user: {
          id: adminUser.id,
          email: adminUser.email,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          role: adminUser.role,
          fullName: `${adminUser.firstName} ${adminUser.lastName}`,
          lastLoginAt: adminUser.lastLoginAt || undefined
        }
      };

    } catch (error: any) {
      logger.error('web_admin_whoami_error', {
        adminId,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred'
        }
      };
    }
  }

  /**
   * Create a new web admin user
   */
  async createWebAdminUser(userData: CreateWebAdminUserRequest): Promise<{ success: boolean; error?: string; user?: any }> {
    try {
      // Validate role
      if (!userData.role || userData.role.trim() === '') {
        return {
          success: false,
          error: `Role is required. Valid web admin roles are: ${VALID_WEB_ADMIN_ROLES.join(', ')}`
        };
      }

      const role = userData.role as typeof VALID_WEB_ADMIN_ROLES[number];
      if (!VALID_WEB_ADMIN_ROLES.includes(role)) {
        return {
          success: false,
          error: `Invalid role: ${role}. Valid web admin roles are: ${VALID_WEB_ADMIN_ROLES.join(', ')}`
        };
      }

      // Check if email already exists
      const existingUsers = await db
        .select()
        .from(webAdminUsers)
        .where(eq(webAdminUsers.email, userData.email))
        .limit(1);

      if (existingUsers.length > 0) {
        return {
          success: false,
          error: 'Email already exists'
        };
      }

      // Hash the password
      const passwordResult = await hashPassword(userData.password);

      // Insert new admin user
      const newAdminUsers = await db
        .insert(webAdminUsers)
        .values({
          email: userData.email,
          password: `${passwordResult.hash}:${passwordResult.salt}`, // Store as hash:salt
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: role,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      const newUser = newAdminUsers[0];

      logger.info('web_admin_user_created', {
        adminId: newUser.id,
        email: newUser.email,
        role: newUser.role,
        createdBy: 'system' // TODO: Add actual creator ID
      });

      return {
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          isActive: newUser.isActive,
          createdAt: newUser.createdAt
        }
      };

    } catch (error: any) {
      logger.error('create_web_admin_user_error', {
        email: userData.email,
        error: error.message,
        stack: error.stack
      });

      return {
        success: false,
        error: 'Failed to create admin user'
      };
    }
  }

  /**
   * Handle failed login attempts
   */
  private async handleFailedLogin(adminId: string): Promise<void> {
    try {
      // Increment login attempts
      const updatedUsers = await db
        .update(webAdminUsers)
        .set({
          loginAttempts: sql`login_attempts + 1`,
          updatedAt: new Date()
        })
        .where(eq(webAdminUsers.id, adminId))
        .returning({
          loginAttempts: webAdminUsers.loginAttempts
        });

      if (updatedUsers.length > 0 && updatedUsers[0].loginAttempts >= 5) {
        // Lock account after 5 failed attempts
        await db
          .update(webAdminUsers)
          .set({
            lockedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(webAdminUsers.id, adminId));
      }

    } catch (error: any) {
      logger.error('handle_failed_login_error', {
        adminId,
        error: error.message
      });
    }
  }

  /**
   * Reset login attempts after successful login
   */
  private async resetLoginAttempts(adminId: string): Promise<void> {
    try {
      await db
        .update(webAdminUsers)
        .set({
          loginAttempts: 0,
          lockedAt: null,
          updatedAt: new Date()
        })
        .where(eq(webAdminUsers.id, adminId));

    } catch (error: any) {
      logger.error('reset_login_attempts_error', {
        adminId,
        error: error.message
      });
    }
  }

  /**
   * Log failed login attempts
   */
  private async logFailedLogin(email: string, reason: string): Promise<void> {
    logger.warn('web_admin_login_failed', {
      email,
      reason,
      timestamp: new Date()
    });
  }
}