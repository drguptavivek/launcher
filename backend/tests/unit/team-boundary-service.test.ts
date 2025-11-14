import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { db } from '../../src/lib/db';
import { TeamBoundaryService, AccessScope, TeamBoundaryContext } from '../../src/services/team-boundary-service';
import { AuthorizationService } from '../../src/services/authorization-service';

// Mock the database and dependencies
vi.mock('../../src/lib/db', () => ({
  db: {
    select: vi.fn(),
  }
}));

vi.mock('../../src/services/authorization-service', () => ({
  AuthorizationService: {
    checkPermission: vi.fn(),
  }
}));

vi.mock('../../src/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}));

describe('TeamBoundaryService', () => {
  const mockUserId = 'user-123';
  const mockTeamId = 'team-456';
  const mockRegionId = 'region-789';
  const mockRequestId = 'request-abc';

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    const mockQueryBuilder = {
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
    };

    vi.mocked(db.select).mockReturnValue(mockQueryBuilder as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('enforceTeamBoundary', () => {
    it('should allow SYSTEM_ADMIN full organizational access', async () => {
      // Mock user with SYSTEM_ADMIN role
      const mockUserAccess = {
        userId: mockUserId,
        primaryTeamId: mockTeamId,
        accessibleTeamIds: [mockTeamId],
        accessibleRegionIds: [mockRegionId],
        crossTeamRoles: ['SYSTEM_ADMIN'],
        isSystemAdmin: true,
        isNationalSupport: false,
        isRegionalManager: false,
        accessScope: AccessScope.ORGANIZATION
      };

      vi.spyOn(TeamBoundaryService, 'getUserTeamAccess').mockResolvedValue(mockUserAccess);

      const context: TeamBoundaryContext = {
        userId: mockUserId,
        targetTeamId: mockTeamId,
        action: 'READ',
        resourceType: 'TEAMS',
        requestId: mockRequestId
      };

      const result = await TeamBoundaryService.enforceTeamBoundary(context);

      expect(result.allowed).toBe(true);
      expect(result.scope).toBe(AccessScope.ORGANIZATION);
      expect(result.accessedThrough).toBe('SYSTEM_ADMIN');
      expect(result.requiresAudit).toBe(false); // READ action on TEAMS is not sensitive
    });

    it('should allow NATIONAL_SUPPORT_ADMIN cross-team operational access', async () => {
      const mockUserAccess = {
        userId: mockUserId,
        primaryTeamId: mockTeamId,
        accessibleTeamIds: [mockTeamId],
        accessibleRegionIds: [mockRegionId],
        crossTeamRoles: ['NATIONAL_SUPPORT_ADMIN'],
        isSystemAdmin: false,
        isNationalSupport: true,
        isRegionalManager: false,
        accessScope: AccessScope.ORGANIZATION
      };

      vi.spyOn(TeamBoundaryService, 'getUserTeamAccess').mockResolvedValue(mockUserAccess);

      const context: TeamBoundaryContext = {
        userId: mockUserId,
        targetTeamId: 'different-team',
        action: 'READ',
        resourceType: 'DEVICES',
        requestId: mockRequestId
      };

      const result = await TeamBoundaryService.enforceTeamBoundary(context);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('NATIONAL_SUPPORT_CROSS_TEAM_ACCESS');
      expect(result.scope).toBe(AccessScope.ORGANIZATION);
      expect(result.accessedThrough).toBe('NATIONAL_SUPPORT_ADMIN');
      expect(result.requiresAudit).toBe(true);
    });

    it('should deny NATIONAL_SUPPORT_ADMIN access to system settings', async () => {
      const mockUserAccess = {
        userId: mockUserId,
        primaryTeamId: mockTeamId,
        accessibleTeamIds: [mockTeamId],
        accessibleRegionIds: [mockRegionId],
        crossTeamRoles: ['NATIONAL_SUPPORT_ADMIN'],
        isSystemAdmin: false,
        isNationalSupport: true,
        isRegionalManager: false,
        accessScope: AccessScope.ORGANIZATION
      };

      vi.spyOn(TeamBoundaryService, 'getUserTeamAccess').mockResolvedValue(mockUserAccess);

      const context: TeamBoundaryContext = {
        userId: mockUserId,
        targetTeamId: mockTeamId,
        action: 'MANAGE',
        resourceType: 'SYSTEM_SETTINGS',
        requestId: mockRequestId
      };

      const result = await TeamBoundaryService.enforceTeamBoundary(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('NATIONAL_SUPPORT_SYSTEM_ACCESS_DENIED');
    });

    it('should allow REGIONAL_MANAGER access within their region', async () => {
      const mockUserAccess = {
        userId: mockUserId,
        primaryTeamId: mockTeamId,
        accessibleTeamIds: [mockTeamId],
        accessibleRegionIds: [mockRegionId],
        crossTeamRoles: ['REGIONAL_MANAGER'],
        isSystemAdmin: false,
        isNationalSupport: false,
        isRegionalManager: true,
        accessScope: AccessScope.REGION
      };

      vi.spyOn(TeamBoundaryService, 'getUserTeamAccess').mockResolvedValue(mockUserAccess);
      vi.spyOn(TeamBoundaryService as any, 'verifyTeamInRegion').mockResolvedValue(true);

      const context: TeamBoundaryContext = {
        userId: mockUserId,
        targetTeamId: 'different-team-in-same-region',
        targetRegionId: mockRegionId,
        action: 'READ',
        resourceType: 'DEVICES',
        requestId: mockRequestId
      };

      const result = await TeamBoundaryService.enforceTeamBoundary(context);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('REGIONAL_MANAGER_ACCESS');
      expect(result.scope).toBe(AccessScope.REGION);
      expect(result.accessedThrough).toBe('REGIONAL_MANAGER');
    });

    it('should deny REGIONAL_MANAGER access outside their region', async () => {
      const mockUserAccess = {
        userId: mockUserId,
        primaryTeamId: mockTeamId,
        accessibleTeamIds: [mockTeamId],
        accessibleRegionIds: [mockRegionId],
        crossTeamRoles: ['REGIONAL_MANAGER'],
        isSystemAdmin: false,
        isNationalSupport: false,
        isRegionalManager: true,
        accessScope: AccessScope.REGION
      };

      vi.spyOn(TeamBoundaryService, 'getUserTeamAccess').mockResolvedValue(mockUserAccess);

      const context: TeamBoundaryContext = {
        userId: mockUserId,
        targetTeamId: 'team-in-different-region',
        targetRegionId: 'different-region',
        action: 'READ',
        resourceType: 'DEVICES',
        requestId: mockRequestId
      };

      const result = await TeamBoundaryService.enforceTeamBoundary(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('REGIONAL_MANAGER_REGION_BOUNDARY_VIOLATION');
    });

    it('should allow standard users access to their own team', async () => {
      const mockUserAccess = {
        userId: mockUserId,
        primaryTeamId: mockTeamId,
        accessibleTeamIds: [mockTeamId],
        accessibleRegionIds: [],
        crossTeamRoles: [],
        isSystemAdmin: false,
        isNationalSupport: false,
        isRegionalManager: false,
        accessScope: AccessScope.TEAM
      };

      vi.spyOn(TeamBoundaryService, 'getUserTeamAccess').mockResolvedValue(mockUserAccess);

      const context: TeamBoundaryContext = {
        userId: mockUserId,
        targetTeamId: mockTeamId,
        action: 'READ',
        resourceType: 'DEVICES',
        requestId: mockRequestId
      };

      const result = await TeamBoundaryService.enforceTeamBoundary(context);

      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('STANDARD_TEAM_ACCESS_GRANTED');
      expect(result.scope).toBe(AccessScope.TEAM);
    });

    it('should deny standard users access to other teams', async () => {
      const mockUserAccess = {
        userId: mockUserId,
        primaryTeamId: mockTeamId,
        accessibleTeamIds: [mockTeamId],
        accessibleRegionIds: [],
        crossTeamRoles: [],
        isSystemAdmin: false,
        isNationalSupport: false,
        isRegionalManager: false,
        accessScope: AccessScope.TEAM
      };

      vi.spyOn(TeamBoundaryService, 'getUserTeamAccess').mockResolvedValue(mockUserAccess);

      const context: TeamBoundaryContext = {
        userId: mockUserId,
        targetTeamId: 'different-team',
        action: 'READ',
        resourceType: 'DEVICES',
        requestId: mockRequestId
      };

      const result = await TeamBoundaryService.enforceTeamBoundary(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('TEAM_BOUNDARY_VIOLATION');
    });

    it('should deny users with no team assignment', async () => {
      const mockUserAccess = {
        userId: mockUserId,
        primaryTeamId: '',
        accessibleTeamIds: [],
        accessibleRegionIds: [],
        crossTeamRoles: [],
        isSystemAdmin: false,
        isNationalSupport: false,
        isRegionalManager: false,
        accessScope: AccessScope.USER
      };

      vi.spyOn(TeamBoundaryService, 'getUserTeamAccess').mockResolvedValue(mockUserAccess);

      const context: TeamBoundaryContext = {
        userId: mockUserId,
        targetTeamId: mockTeamId,
        action: 'READ',
        resourceType: 'DEVICES',
        requestId: mockRequestId
      };

      const result = await TeamBoundaryService.enforceTeamBoundary(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('NO_TEAM_ASSIGNMENT');
      expect(result.scope).toBe(AccessScope.USER);
    });
  });

  describe('getUserTeamAccess', () => {
    it('should correctly parse user team access information', async () => {
      const mockUser = {
        id: mockUserId,
        code: 'USER001',
        teamId: mockTeamId,
        displayName: 'Test User',
        isActive: true
      };

      const mockTeam = {
        id: mockTeamId,
        name: 'Test Team',
        isActive: true
      };

      const mockQueryBuilder = {
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
      };

      // Mock the result without .limit() to match the actual implementation
      const mockResult = [
        {
          user: mockUser,
          team: mockTeam,
          assignments: {
            assignment: {
              userId: mockUserId,
              teamId: mockTeamId,
              regionId: mockRegionId,
              isActive: true
            },
            role: {
              name: 'SYSTEM_ADMIN',
              isActive: true
            }
          }
        }
      ];

      mockQueryBuilder.limit = vi.fn().mockResolvedValue(mockResult);

      vi.mocked(db.select).mockReturnValue(mockQueryBuilder as any);

      const result = await TeamBoundaryService.getUserTeamAccess(mockUserId);

      expect(result.userId).toBe(mockUserId);
      expect(result.primaryTeamId).toBe(mockTeamId);
      expect(result.accessibleTeamIds).toContain(mockTeamId);
      expect(result.accessibleRegionIds).toContain(mockRegionId);
      expect(result.crossTeamRoles).toContain('SYSTEM_ADMIN');
      expect(result.isSystemAdmin).toBe(true);
      expect(result.accessScope).toBe(AccessScope.ORGANIZATION);
    });

    it('should handle users without assignments gracefully', async () => {
      const mockQueryBuilder = {
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([])
      };

      vi.mocked(db.select).mockReturnValue(mockQueryBuilder as any);

      const result = await TeamBoundaryService.getUserTeamAccess(mockUserId);

      expect(result.userId).toBe(mockUserId);
      expect(result.primaryTeamId).toBe('');
      expect(result.accessibleTeamIds).toEqual([]);
      expect(result.accessScope).toBe(AccessScope.USER);
    });
  });

  describe('Utility Methods', () => {
    beforeEach(() => {
      vi.spyOn(TeamBoundaryService, 'enforceTeamBoundary').mockResolvedValue({
        allowed: true,
        reason: 'TEST_ACCESS',
        scope: AccessScope.TEAM
      });
    });

    it('should check if user can access team', async () => {
      const result = await TeamBoundaryService.canUserAccessTeam(mockUserId, mockTeamId);

      expect(result).toBe(true);
      expect(TeamBoundaryService.enforceTeamBoundary).toHaveBeenCalledWith({
        userId: mockUserId,
        targetTeamId: mockTeamId,
        action: 'READ',
        resourceType: 'TEAMS'
      });
    });

    it('should get user accessible teams', async () => {
      const mockUserAccess = {
        userId: mockUserId,
        primaryTeamId: mockTeamId,
        accessibleTeamIds: [mockTeamId, 'team-2', 'team-3'],
        accessibleRegionIds: [],
        crossTeamRoles: [],
        isSystemAdmin: false,
        isNationalSupport: false,
        isRegionalManager: false,
        accessScope: AccessScope.TEAM
      };

      vi.spyOn(TeamBoundaryService, 'getUserTeamAccess').mockResolvedValue(mockUserAccess);

      const result = await TeamBoundaryService.getUserAccessibleTeams(mockUserId);

      expect(result).toEqual([mockTeamId, 'team-2', 'team-3']);
    });

    it('should check if user has cross-team access', async () => {
      const mockUserAccess = {
        userId: mockUserId,
        primaryTeamId: mockTeamId,
        accessibleTeamIds: [mockTeamId],
        accessibleRegionIds: [],
        crossTeamRoles: ['NATIONAL_SUPPORT_ADMIN'],
        isSystemAdmin: false,
        isNationalSupport: true,
        isRegionalManager: false,
        accessScope: AccessScope.ORGANIZATION
      };

      vi.spyOn(TeamBoundaryService, 'getUserTeamAccess').mockResolvedValue(mockUserAccess);

      const result = await TeamBoundaryService.hasCrossTeamAccess(mockUserId);

      expect(result).toBe(true);
    });

    it('should validate team context', async () => {
      const context: TeamBoundaryContext = {
        userId: mockUserId,
        targetTeamId: mockTeamId,
        action: 'UPDATE',
        resourceType: 'TEAMS'
      };

      const result = await TeamBoundaryService.validateTeamContext(mockUserId, mockTeamId, 'UPDATE');

      expect(TeamBoundaryService.enforceTeamBoundary).toHaveBeenCalledWith(context);
    });

    it('should get user access scope', async () => {
      const mockUserAccess = {
        userId: mockUserId,
        primaryTeamId: mockTeamId,
        accessibleTeamIds: [mockTeamId],
        accessibleRegionIds: [],
        crossTeamRoles: [],
        isSystemAdmin: false,
        isNationalSupport: false,
        isRegionalManager: false,
        accessScope: AccessScope.TEAM
      };

      vi.spyOn(TeamBoundaryService, 'getUserTeamAccess').mockResolvedValue(mockUserAccess);

      const result = await TeamBoundaryService.getUserAccessScope(mockUserId);

      expect(result).toBe(AccessScope.TEAM);
    });
  });

  describe('Privilege Escalation Detection', () => {
    it('should detect privilege escalation attempts', async () => {
      const mockUserAccess = {
        userId: mockUserId,
        primaryTeamId: mockTeamId,
        accessibleTeamIds: [mockTeamId],
        accessibleRegionIds: [],
        crossTeamRoles: [],
        isSystemAdmin: false,
        isNationalSupport: false,
        isRegionalManager: false,
        accessScope: AccessScope.TEAM
      };

      vi.spyOn(TeamBoundaryService, 'getUserTeamAccess').mockResolvedValue(mockUserAccess);

      const context: TeamBoundaryContext = {
        userId: mockUserId,
        targetTeamId: mockTeamId,
        action: 'READ',
        resourceType: 'TEAMS'
      };

      const result = await TeamBoundaryService.detectPrivilegeEscalation(
        mockUserId,
        AccessScope.ORGANIZATION,
        context
      );

      expect(result).toBe(true);
    });

    it('should not flag legitimate access as privilege escalation', async () => {
      const mockUserAccess = {
        userId: mockUserId,
        primaryTeamId: mockTeamId,
        accessibleTeamIds: [mockTeamId],
        accessibleRegionIds: [],
        crossTeamRoles: ['SYSTEM_ADMIN'],
        isSystemAdmin: true,
        isNationalSupport: false,
        isRegionalManager: false,
        accessScope: AccessScope.ORGANIZATION
      };

      vi.spyOn(TeamBoundaryService, 'getUserTeamAccess').mockResolvedValue(mockUserAccess);

      const context: TeamBoundaryContext = {
        userId: mockUserId,
        targetTeamId: mockTeamId,
        action: 'READ',
        resourceType: 'TEAMS'
      };

      const result = await TeamBoundaryService.detectPrivilegeEscalation(
        mockUserId,
        AccessScope.ORGANIZATION,
        context
      );

      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should fail secure on database errors', async () => {
      vi.spyOn(TeamBoundaryService, 'getUserTeamAccess').mockRejectedValue(new Error('Database error'));

      const context: TeamBoundaryContext = {
        userId: mockUserId,
        targetTeamId: mockTeamId,
        action: 'READ',
        resourceType: 'TEAMS'
      };

      const result = await TeamBoundaryService.enforceTeamBoundary(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('BOUNDARY_ENFORCEMENT_ERROR');
    });

    it('should handle team region verification errors', async () => {
      const mockUserAccess = {
        userId: mockUserId,
        primaryTeamId: mockTeamId,
        accessibleTeamIds: [mockTeamId],
        accessibleRegionIds: [mockRegionId],
        crossTeamRoles: ['REGIONAL_MANAGER'],
        isSystemAdmin: false,
        isNationalSupport: false,
        isRegionalManager: true,
        accessScope: AccessScope.REGION
      };

      vi.spyOn(TeamBoundaryService, 'getUserTeamAccess').mockResolvedValue(mockUserAccess);
      vi.spyOn(TeamBoundaryService as any, 'verifyTeamInRegion').mockRejectedValue(new Error('Region verification error'));

      const context: TeamBoundaryContext = {
        userId: mockUserId,
        targetTeamId: mockTeamId,
        targetRegionId: mockRegionId,
        action: 'READ',
        resourceType: 'TEAMS'
      };

      const result = await TeamBoundaryService.enforceTeamBoundary(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('BOUNDARY_ENFORCEMENT_ERROR');
    });
  });

  describe('Integration with AuthorizationService', () => {
    it('should verify cross-team permissions using AuthorizationService', async () => {
      const mockUserAccess = {
        userId: mockUserId,
        primaryTeamId: mockTeamId,
        accessibleTeamIds: [mockTeamId],
        accessibleRegionIds: [],
        crossTeamRoles: ['AUDITOR'],
        isSystemAdmin: false,
        isNationalSupport: false,
        isRegionalManager: false,
        accessScope: AccessScope.ORGANIZATION
      };

      vi.spyOn(TeamBoundaryService, 'getUserTeamAccess').mockResolvedValue(mockUserAccess);
      vi.mocked(AuthorizationService.checkPermission).mockResolvedValue({
        allowed: true,
        reason: 'AUDITOR_CROSS_TEAM_ACCESS'
      });

      const context: TeamBoundaryContext = {
        userId: mockUserId,
        targetTeamId: 'different-team',
        action: 'READ',
        resourceType: 'DEVICES'
      };

      const result = await TeamBoundaryService.enforceTeamBoundary(context);

      expect(AuthorizationService.checkPermission).toHaveBeenCalledWith(
        mockUserId,
        'DEVICES',
        'READ',
        { teamId: undefined }
      );
      expect(result.allowed).toBe(true);
    });

    it('should deny access when AuthorizationService denies permissions', async () => {
      const mockUserAccess = {
        userId: mockUserId,
        primaryTeamId: mockTeamId,
        accessibleTeamIds: [mockTeamId], // Only include primary team, NOT target team
        accessibleRegionIds: [],
        crossTeamRoles: ['AUDITOR'],
        isSystemAdmin: false,
        isNationalSupport: false,
        isRegionalManager: false,
        accessScope: AccessScope.ORGANIZATION
      };

      vi.spyOn(TeamBoundaryService, 'getUserTeamAccess').mockResolvedValue(mockUserAccess);
      vi.mocked(AuthorizationService.checkPermission).mockResolvedValue({
        allowed: false,
        reason: 'INSUFFICIENT_PERMISSIONS'
      });

      const context: TeamBoundaryContext = {
        userId: mockUserId,
        targetTeamId: 'different-team', // Target team not in accessibleTeamIds
        action: 'DELETE',
        resourceType: 'DEVICES'
      };

      const result = await TeamBoundaryService.enforceTeamBoundary(context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('CROSS_TEAM_PERMISSION_DENIED');
    });
  });
});