import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebAdminAuthService } from '../../src/services/web-admin-auth-service';
import { db } from '../../src/lib/db';
import { webAdminUsers } from '../../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../../src/lib/crypto';

describe('WebAdminAuthService', () => {
  let authService: WebAdminAuthService;

  beforeEach(async () => {
    authService = new WebAdminAuthService();

    // Clean up test data
    await db.delete(webAdminUsers).where(eq(webAdminUsers.email, 'test@example.com'));
    await db.delete(webAdminUsers).where(eq(webAdminUsers.email, 'inactive@example.com'));
    await db.delete(webAdminUsers).where(eq(webAdminUsers.email, 'locked@example.com'));
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(webAdminUsers).where(eq(webAdminUsers.email, 'test@example.com'));
    await db.delete(webAdminUsers).where(eq(webAdminUsers.email, 'inactive@example.com'));
    await db.delete(webAdminUsers).where(eq(webAdminUsers.email, 'locked@example.com'));
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      // Create test user
      const passwordResult = await hashPassword('testPassword123');
      const [testUser] = await db.insert(webAdminUsers).values({
        email: 'test@example.com',
        password: `${passwordResult.hash}:${passwordResult.salt}`,
        firstName: 'Test',
        lastName: 'User',
        role: 'SYSTEM_ADMIN',
        isActive: true
      }).returning();

      const result = await authService.login({
        email: 'test@example.com',
        password: 'testPassword123'
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.email).toBe('test@example.com');
      expect(result.user?.firstName).toBe('Test');
      expect(result.user?.lastName).toBe('User');
      expect(result.user?.role).toBe('SYSTEM_ADMIN');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should reject login with invalid email', async () => {
      const result = await authService.login({
        email: 'nonexistent@example.com',
        password: 'anyPassword'
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
      expect(result.error?.message).toBe('Invalid email or password');
    });

    it('should reject login with invalid password', async () => {
      // Create test user
      const passwordResult = await hashPassword('correctPassword');
      await db.insert(webAdminUsers).values({
        email: 'test@example.com',
        password: `${passwordResult.hash}:${passwordResult.salt}`,
        firstName: 'Test',
        lastName: 'User',
        role: 'SYSTEM_ADMIN',
        isActive: true
      });

      const result = await authService.login({
        email: 'test@example.com',
        password: 'wrongPassword'
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login for inactive account', async () => {
      // Create inactive test user
      const passwordResult = await hashPassword('testPassword123');
      await db.insert(webAdminUsers).values({
        email: 'inactive@example.com',
        password: `${passwordResult.hash}:${passwordResult.salt}`,
        firstName: 'Inactive',
        lastName: 'User',
        role: 'SYSTEM_ADMIN',
        isActive: false
      });

      const result = await authService.login({
        email: 'inactive@example.com',
        password: 'testPassword123'
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ACCOUNT_INACTIVE');
    });

    it('should reject login for locked account', async () => {
      // Create locked test user
      const passwordResult = await hashPassword('testPassword123');
      await db.insert(webAdminUsers).values({
        email: 'locked@example.com',
        password: `${passwordResult.hash}:${passwordResult.salt}`,
        firstName: 'Locked',
        lastName: 'User',
        role: 'SYSTEM_ADMIN',
        isActive: true,
        loginAttempts: 5,
        lockedAt: new Date(Date.now() + 60000) // Locked for 1 minute
      });

      const result = await authService.login({
        email: 'locked@example.com',
        password: 'testPassword123'
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ACCOUNT_LOCKED');
    });

    it('should lock account after 5 failed login attempts', async () => {
      // Create test user
      const passwordResult = await hashPassword('correctPassword');
      await db.insert(webAdminUsers).values({
        email: 'test@example.com',
        password: `${passwordResult.hash}:${passwordResult.salt}`,
        firstName: 'Test',
        lastName: 'User',
        role: 'SYSTEM_ADMIN',
        isActive: true
      });

      // Attempt 5 failed logins
      for (let i = 0; i < 5; i++) {
        await authService.login({
          email: 'test@example.com',
          password: 'wrongPassword'
        });
      }

      // Check that account is locked
      const [lockedUser] = await db.select()
        .from(webAdminUsers)
        .where(eq(webAdminUsers.email, 'test@example.com'));

      expect(lockedUser.loginAttempts).toBe(5);
      expect(lockedUser.lockedAt).toBeDefined();
      expect(lockedUser.lockedAt!.getTime()).toBeGreaterThan(Date.now());
    });

    it('should reset login attempts on successful login', async () => {
      // Create test user with failed attempts
      const passwordResult = await hashPassword('correctPassword');
      await db.insert(webAdminUsers).values({
        email: 'test@example.com',
        password: `${passwordResult.hash}:${passwordResult.salt}`,
        firstName: 'Test',
        lastName: 'User',
        role: 'SYSTEM_ADMIN',
        isActive: true,
        loginAttempts: 3
      });

      // Successful login
      await authService.login({
        email: 'test@example.com',
        password: 'correctPassword'
      });

      // Check that login attempts are reset
      const [user] = await db.select()
        .from(webAdminUsers)
        .where(eq(webAdminUsers.email, 'test@example.com'));

      expect(user.loginAttempts).toBe(0);
      expect(user.lockedAt).toBeNull();
    });

    it('should update last login time on successful login', async () => {
      // Create test user
      const passwordResult = await hashPassword('testPassword123');
      const [testUser] = await db.insert(webAdminUsers).values({
        email: 'test@example.com',
        password: `${passwordResult.hash}:${passwordResult.salt}`,
        firstName: 'Test',
        lastName: 'User',
        role: 'SYSTEM_ADMIN',
        isActive: true,
        lastLoginAt: null
      }).returning();

      // Login
      await authService.login({
        email: 'test@example.com',
        password: 'testPassword123'
      });

      // Check that last login time is updated
      const [user] = await db.select()
        .from(webAdminUsers)
        .where(eq(webAdminUsers.email, 'test@example.com'));

      expect(user.lastLoginAt).toBeDefined();
      expect(user.lastLoginAt!.getTime()).toBeGreaterThan(testUser.createdAt.getTime());
    });
  });

  describe('whoami', () => {
    it('should return user information for valid admin ID', async () => {
      // Create test user
      const passwordResult = await hashPassword('testPassword123');
      const [testUser] = await db.insert(webAdminUsers).values({
        email: 'test@example.com',
        password: `${passwordResult.hash}:${passwordResult.salt}`,
        firstName: 'Test',
        lastName: 'User',
        role: 'FIELD_SUPERVISOR',
        isActive: true
      }).returning();

      const result = await authService.whoami(testUser.id);

      expect(result.success).toBe(true);
      expect(result.user?.id).toBe(testUser.id);
      expect(result.user?.email).toBe('test@example.com');
      expect(result.user?.firstName).toBe('Test');
      expect(result.user?.lastName).toBe('User');
      expect(result.user?.role).toBe('FIELD_SUPERVISOR');
      expect(result.user?.fullName).toBe('Test User');
    });

    it('should return error for invalid admin ID', async () => {
      const result = await authService.whoami('00000000-0000-0000-0000-000000000000');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('USER_NOT_FOUND');
    });

    it('should return error for inactive user', async () => {
      // Create inactive test user
      const passwordResult = await hashPassword('testPassword123');
      const [testUser] = await db.insert(webAdminUsers).values({
        email: 'inactive@example.com',
        password: `${passwordResult.hash}:${passwordResult.salt}`,
        firstName: 'Inactive',
        lastName: 'User',
        role: 'SYSTEM_ADMIN',
        isActive: false
      }).returning();

      const result = await authService.whoami(testUser.id);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ACCOUNT_INACTIVE');
    });
  });

  describe('createWebAdminUser', () => {
    it('should create a new admin user successfully', async () => {
      const result = await authService.createWebAdminUser({
        email: 'newadmin@example.com',
        password: 'newPassword123',
        firstName: 'New',
        lastName: 'Admin',
        role: 'SUPPORT_AGENT'
      });

      expect(result.success).toBe(true);
      expect(result.user?.email).toBe('newadmin@example.com');
      expect(result.user?.firstName).toBe('New');
      expect(result.user?.lastName).toBe('Admin');
      expect(result.user?.role).toBe('SUPPORT_AGENT');
      expect(result.user?.isActive).toBe(true);

      // Verify user was actually created in database
      const [user] = await db.select()
        .from(webAdminUsers)
        .where(eq(webAdminUsers.email, 'newadmin@example.com'));

      expect(user).toBeDefined();
      expect(user.email).toBe('newadmin@example.com');
    });

    it('should reject creation with duplicate email', async () => {
      // Create existing user
      const passwordResult = await hashPassword('testPassword123');
      await db.insert(webAdminUsers).values({
        email: 'existing@example.com',
        password: `${passwordResult.hash}:${passwordResult.salt}`,
        firstName: 'Existing',
        lastName: 'User',
        role: 'SYSTEM_ADMIN',
        isActive: true
      });

      const result = await authService.createWebAdminUser({
        email: 'existing@example.com',
        password: 'newPassword123',
        firstName: 'New',
        lastName: 'User'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already exists');
    });

    it('should create user with default SYSTEM_ADMIN role', async () => {
      const result = await authService.createWebAdminUser({
        email: 'default@example.com',
        password: 'password123',
        firstName: 'Default',
        lastName: 'User'
      });

      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('SYSTEM_ADMIN');
    });
  });

  describe('password security', () => {
    it('should hash passwords correctly', async () => {
      const password = 'testPassword123';
      const passwordResult = await hashPassword(password);

      // Create user with hashed password
      const [testUser] = await db.insert(webAdminUsers).values({
        email: 'test@example.com',
        password: `${passwordResult.hash}:${passwordResult.salt}`,
        firstName: 'Test',
        lastName: 'User',
        role: 'SYSTEM_ADMIN',
        isActive: true
      }).returning();

      // Verify login works with correct password
      const result = await authService.login({
        email: 'test@example.com',
        password: 'testPassword123'
      });

      expect(result.success).toBe(true);

      // Verify stored password is not plain text
      expect(testUser.password).not.toBe(password);
      expect(testUser.password.length).toBeGreaterThan(50); // Argon2id hash length
      expect(testUser.password).toMatch(/^\$argon2id/); // Argon2id format
    });
  });
});