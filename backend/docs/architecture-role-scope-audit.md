# Architecture, Role, and Scope Audit Rules

**Last Updated:** November 17, 2025
**Version:** 1.0
**Scope:** Complete SurveyLauncher Enterprise System

---

## Audit Overview

This document defines comprehensive audit rules for validating the SurveyLauncher Enterprise Architecture, including RBAC implementation, project scoping, geographic boundaries, and compliance requirements. These rules ensure system integrity, security compliance, and operational effectiveness.

---

## Audit Framework Structure

### **Audit Categories**
1. **Architecture Compliance** - System design and relationship validation
2. **Role-Based Access Control (RBAC)** - Permission matrix and role enforcement
3. **Project Scoping** - Operational boundary enforcement
4. **Geographic Boundaries** - Regional access validation
5. **Data Integrity** - Schema consistency and relationship integrity
6. **Security Compliance** - Authentication, authorization, and audit trails
7. **Operational Effectiveness** - Business rule enforcement and workflow validation

---

## 1. Architecture Compliance Audit Rules

### **AC-001: Organizational Hierarchy Validation**
**Rule:** Validate Organizations → Teams → Projects hierarchy integrity

**Audit Checklist:**
- [ ] All `teams.organizationId` reference valid `organizations.id`
- [ ] All `projects.organizationId` reference valid `organizations.id`
- [ ] Regional projects (`geographicScope = 'REGIONAL'`) have valid `projects.regionId` → `teams.id`
- [ ] National projects (`geographicScope = 'NATIONAL'`) have `projects.regionId = NULL`
- [ ] No orphaned records exist (organizations without teams, teams without organization)

**SQL Validation:**
```sql
-- Verify organization-team relationships
SELECT COUNT(*) as orphaned_teams
FROM teams t LEFT JOIN organizations o ON t.organizationId = o.id
WHERE o.id IS NULL;

-- Verify project-organization relationships
SELECT COUNT(*) as orphaned_projects
FROM projects p LEFT JOIN organizations o ON p.organizationId = o.id
WHERE o.id IS NULL;

-- Verify regional project team references
SELECT COUNT(*) as invalid_regional_projects
FROM projects p
WHERE p.geographicScope = 'REGIONAL'
  AND p.regionId IS NOT NULL
  AND p.regionId NOT IN (SELECT id FROM teams);
```

### **AC-002: Schema Alignment Validation**
**Rule:** Ensure database schema matches documented architecture

**Audit Checklist:**
- [ ] All tables from architecture guide exist in schema
- [ ] Foreign key relationships match documented design
- [ ] Enum values match 9-role system specifications
- [ ] Index patterns support query performance requirements
- [ ] Table structures support documented workflows

**Validation Scripts:**
```bash
# Run schema validation
npm run db:validate-schema

# Check foreign key constraints
npm run audit:foreign-keys

# Validate enum compliance
npm run audit:role-enums
```

---

## 2. RBAC System Audit Rules

### **RBAC-001: Role Definition Compliance**
**Rule:** Validate all 9 system roles are properly defined with correct permissions

**Audit Checklist:**
- [ ] All 9 roles exist in `roles` table with proper hierarchy levels
- [ ] Role hierarchy levels: TEAM_MEMBER (1) → FIELD_SUPERVISOR (2) → REGIONAL_MANAGER (3)
- [ ] Technical roles: SYSTEM_ADMIN (10), SUPPORT_AGENT (8), AUDITOR (7)
- [ ] Specialized roles: DEVICE_MANAGER (6), POLICY_ADMIN (5), NATIONAL_SUPPORT_ADMIN (9)
- [ ] Role display names and descriptions match specifications

**SQL Validation:**
```sql
-- Verify all required roles exist
SELECT name, hierarchyLevel, isActive FROM roles
WHERE name IN (
  'TEAM_MEMBER', 'FIELD_SUPERVISOR', 'REGIONAL_MANAGER',
  'SYSTEM_ADMIN', 'SUPPORT_AGENT', 'AUDITOR',
  'DEVICE_MANAGER', 'POLICY_ADMIN', 'NATIONAL_SUPPORT_ADMIN'
)
ORDER BY hierarchyLevel;

-- Check role hierarchy integrity
SELECT r1.name as lower_role, r2.name as higher_role
FROM userRoleAssignments ura1
JOIN userRoleAssignments ura2 ON ura1.userId = ura2.userId
JOIN roles r1 ON ura1.roleId = r1.id
JOIN roles r2 ON ura2.roleId = r2.id
WHERE r1.hierarchyLevel >= r2.hierarchyLevel;
```

### **RBAC-002: Permission Matrix Validation**
**Rule:** Ensure role-permission assignments match documented permission matrix

**Audit Checklist:**
- [ ] Each role has correct permissions for all resource types
- [ ] PROJECTS resource permissions configured for all roles
- [ ] Geographic scope permissions enforced (ORGANIZATION, REGION, TEAM, USER)
- [ ] Action permissions properly assigned (CREATE, READ, UPDATE, DELETE, MANAGE, EXECUTE)
- [ ] Cross-team access limited to NATIONAL_SUPPORT_ADMIN and SYSTEM_ADMIN

**SQL Validation:**
```sql
-- Verify PROJECTS permissions for all roles
SELECT DISTINCT r.name as role_name, p.action, p.scope
FROM role_permissions rp
JOIN roles r ON rp.roleId = r.id
JOIN permissions p ON rp.permissionId = p.id
WHERE p.resource = 'PROJECTS'
ORDER BY r.name, p.action;

-- Check for unauthorized cross-team access
SELECT u.displayName, u.role, COUNT(DISTINCT t.id) as team_count
FROM users u
JOIN projectAssignments pa ON u.id = pa.userId
JOIN projects p ON pa.projectId = p.id
JOIN projectTeamAssignments pta ON p.id = pta.projectId
JOIN teams t ON pta.teamId = t.id
WHERE u.teamId != t.id
  AND u.role NOT IN ('NATIONAL_SUPPORT_ADMIN', 'SYSTEM_ADMIN')
GROUP BY u.id, u.displayName, u.role
HAVING COUNT(DISTINCT t.id) > 1;
```

### **RBAC-003: User Role Assignment Validation**
**Rule:** Validate user role assignments follow business rules

**Audit Checklist:**
- [ ] All user role assignments have valid `roleId` and `userId`
- [ ] Assignment expiration dates are respected
- [ ] Hybrid roles (FIELD_SUPERVISOR, REGIONAL_MANAGER) have proper context
- [ ] TEAM_MEMBER roles limited to mobile interface access
- [ ] Role assignment audit trail is complete

**SQL Validation:**
```sql
-- Check expired role assignments
SELECT ura.*, u.displayName, r.name as role_name
FROM userRoleAssignments ura
JOIN users u ON ura.userId = u.id
JOIN roles r ON ura.roleId = r.id
WHERE ura.expiresAt IS NOT NULL AND ura.expiresAt < NOW()
  AND ura.isActive = true;

-- Verify TEAM_MEMBER interface restrictions
SELECT DISTINCT u.id, u.displayName, u.email
FROM users u
JOIN userRoleAssignments ura ON u.id = ura.userId
JOIN roles r ON ura.roleId = r.id
WHERE r.name = 'TEAM_MEMBER' AND ura.isActive = true
  AND u.id IN (SELECT userId FROM web_admin_users WHERE isActive = true);
```

---

## 3. Project Scoping Audit Rules

### **PS-001: Project Assignment Validation**
**Rule:** Ensure project assignments respect scoping rules

**Audit Checklist:**
- [ ] Individual user assignments don't violate project boundaries
- [ ] Team assignments include all team members automatically
- [ ] Assignment active/inactive status is properly enforced
- [ ] Temporary assignments respect expiration dates
- [ ] Assignment audit trail is complete and traceable

**SQL Validation:**
```sql
-- Verify team project assignments include all team members
SELECT t.name as team_name, p.title as project_title,
       COUNT(DISTINCT u.id) as team_members,
       COUNT(DISTINCT pa.userId) as assigned_members
FROM teams t
JOIN projectTeamAssignments pta ON t.id = pta.teamId
JOIN projects p ON pta.projectId = p.id
JOIN users u ON t.id = u.teamId AND u.isActive = true
LEFT JOIN projectAssignments pa ON p.id = pa.projectId AND u.id = pa.userId AND pa.isActive = true
WHERE pta.isActive = true
GROUP BY t.id, t.name, p.id, p.title
HAVING COUNT(DISTINCT u.id) != COUNT(DISTINCT pa.userId);

-- Check for inactive assignments with active access
SELECT pa.*, u.displayName, p.title
FROM projectAssignments pa
JOIN users u ON pa.userId = u.id
JOIN projects p ON pa.projectId = p.id
WHERE pa.isActive = false
  AND EXISTS (
    SELECT 1 FROM userRoleAssignments ura
    WHERE ura.userId = u.id AND ura.isActive = true
  );
```

### **PS-002: Geographic Scope Enforcement**
**Rule:** Validate project geographic boundaries are enforced

**Audit Checklist:**
- [ ] Regional projects only access teams in specified region
- [ ] National projects can access all teams across organizations
- [ ] Cross-regional access requires proper authorization
- [ ] Geographic scope changes are audited and logged
- [ ] Region-based team relationships are consistent

**SQL Validation:**
```sql
-- Verify regional project team assignments respect geographic boundaries
SELECT p.title as project_title, p.geographicScope,
       t_region.name as region_team, t_assigned.name as assigned_team,
       t_region.stateId as region_state, t_assigned.stateId as assigned_state
FROM projects p
JOIN teams t_region ON p.regionId = t_region.id
JOIN projectTeamAssignments pta ON p.id = pta.projectId
JOIN teams t_assigned ON pta.teamId = t_assigned.id
WHERE p.geographicScope = 'REGIONAL'
  AND pta.isActive = true
  AND t_region.stateId != t_assigned.stateId;

-- Check for unauthorized national project access
SELECT u.displayName, u.role, p.title, t.name as team_name, o.name as org_name
FROM users u
JOIN projectAssignments pa ON u.id = pa.userId
JOIN projects p ON pa.projectId = p.id
JOIN projectTeamAssignments pta ON p.id = pta.projectId
JOIN teams t ON pta.teamId = t.id
JOIN organizations o ON t.organizationId = o.id
WHERE p.geographicScope = 'NATIONAL'
  AND u.role NOT IN ('SYSTEM_ADMIN', 'NATIONAL_SUPPORT_ADMIN')
  AND u.teamId != t.id
  AND pa.isActive = true;
```

---

## 4. Geographic Boundaries Audit Rules

### **GB-001: Team Geographic Validation**
**Rule:** Ensure team geographic assignments are logical and consistent

**Audit Checklist:**
- [ ] Team stateId values correspond to valid Indian state codes
- [ ] Teams in same geographic region have logical state assignments
- [ ] Organization-state relationships are consistent with business logic
- [ ] Multi-state teams have proper justification and authorization
- [ ] Geographic boundaries support operational requirements

**SQL Validation:**
```sql
-- Validate team state codes (Indian states)
SELECT DISTINCT t.stateId, COUNT(*) as team_count
FROM teams t
WHERE t.stateId NOT IN (
  'DL', 'MH', 'KA', 'TN', 'AP', 'TS', 'WB', 'UP', 'PB', 'RJ',
  'GJ', 'HR', 'CH', 'MP', 'CG', 'OD', 'JH', 'AS', 'BR', 'KL'
)
GROUP BY t.stateId;

-- Check for conflicting team assignments across regions
SELECT u.displayName, COUNT(DISTINCT t.stateId) as state_count,
       STRING_AGG(DISTINCT t.stateId, ', ') as assigned_states
FROM users u
JOIN teams t ON u.teamId = t.id
WHERE u.isActive = true
GROUP BY u.id, u.displayName
HAVING COUNT(DISTINCT t.stateId) > 1;
```

### **GB-002: Regional Manager Scope Validation**
**Rule:** Validate REGIONAL_MANAGER geographic boundaries

**Audit Checklist:**
- [ ] Regional managers only oversee teams in their assigned region
- [ ] Cross-regional oversight requires NATIONAL_SUPPORT_ADMIN assignment
- [ ] Regional manager projects respect geographic constraints
- [ ] Region-based supervision boundaries are enforced in API layer
- [ ] Regional manager access logs show geographic compliance

**SQL Validation:**
```sql
-- Verify regional manager team oversight
SELECT rm.displayName as regional_manager,
       rm_team.name as manager_team, rm_team.stateId as manager_state,
       t.name as overseen_team, t.stateId as team_state
FROM users rm
JOIN userRoleAssignments ura_rm ON rm.id = ura_rm.userId
JOIN roles r_rm ON ura_rm.roleId = r_rm.id
JOIN teams rm_team ON rm.teamId = rm_team.id
JOIN users u ON u.teamId = rm_team.id
JOIN teams t ON u.teamId = t.id
WHERE r_rm.name = 'REGIONAL_MANAGER' AND ura_rm.isActive = true
  AND rm.isActive = true
  AND t.stateId != rm_team.stateId;

-- Check regional manager project access compliance
SELECT u.displayName, p.title, p.geographicScope, t.name as team_name
FROM users u
JOIN userRoleAssignments ura ON u.id = ura.userId
JOIN roles r ON ura.roleId = r.id
JOIN projectAssignments pa ON u.id = pa.userId
JOIN projects p ON pa.projectId = p.id
JOIN teams t ON u.teamId = t.id
WHERE r.name = 'REGIONAL_MANAGER'
  AND pa.isActive = true
  AND p.geographicScope = 'REGIONAL'
  AND p.regionId != t.id;
```

---

## 5. Security Compliance Audit Rules

### **SC-001: Authentication Flow Validation**
**Rule:** Ensure authentication flows comply with security requirements

**Audit Checklist:**
- [ ] Multi-factor authentication enforced for mobile access
- [ ] Interface separation: Mobile vs Web Admin authentication paths
- [ ] Session management includes proper timeout and revocation
- [ ] JWT token validation includes proper signature verification
- [ ] Failed authentication attempts trigger lockout mechanisms

**Audit Scripts:**
```bash
# Test authentication endpoint security
npm run audit:auth-security

# Validate session management
npm run audit:session-compliance

# Check JWT token security
npm run audit:jwt-validation
```

### **SC-002: Authorization Boundary Testing**
**Rule:** Test authorization boundaries across all interfaces

**Audit Checklist:**
- [ ] ROLE-based API access control enforced consistently
- [ ] Cross-team access prevention validated
- [ ] Geographic boundary restrictions enforced
- [ ] Project scoping limits respected
- [ ] Privilege escalation attempts are blocked and logged

**Security Tests:**
```bash
# Run RBAC security tests
npm run test:rbac-security

# Test cross-team access prevention
npm run test:cross-team-security

# Validate geographic boundary enforcement
npm run test:geographic-security
```

---

## 6. Data Integrity Audit Rules

### **DI-001: Referential Integrity Validation**
**Rule:** Ensure all foreign key relationships maintain integrity

**Audit Checklist:**
- [ ] No orphaned records in any table with foreign key constraints
- [ ] Cascade delete operations maintain consistency
- [ ] Soft delete records don't break active relationships
- [ ] Audit trail records maintain proper referential integrity
- [ ] Historical data preserves relationship context

**SQL Validation:**
```sql
-- Comprehensive referential integrity check
SELECT 'organizations' as table_name, COUNT(*) as orphaned_count
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM teams t WHERE t.organizationId = o.id
) AND NOT EXISTS (
  SELECT 1 FROM projects p WHERE p.organizationId = o.id
)

UNION ALL

SELECT 'teams' as table_name, COUNT(*) as orphaned_count
FROM teams t
WHERE NOT EXISTS (
  SELECT 1 FROM organizations o WHERE o.id = t.organizationId
)

UNION ALL

SELECT 'projects' as table_name, COUNT(*) as orphaned_count
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM organizations o WHERE o.id = p.organizationId
)

UNION ALL

SELECT 'users' as table_name, COUNT(*) as orphaned_count
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM teams t WHERE t.id = u.teamId
);
```

### **DI-002: Data Consistency Validation**
**Rule:** Ensure data consistency across related tables

**Audit Checklist:**
- [ ] User role assignments match user table roles
- [ ] Project assignments respect active/inactive status
- [ ] Team assignments align with organizational membership
- [ ] Session data reflects current user status
- [ ] Telemetry data maintains device-user relationships

---

## **7. Operational Effectiveness Audit Rules**

### **OE-001: Business Rule Enforcement**
**Rule:** Validate business rules are enforced across operations

**Audit Checklist:**
- [ ] Minimum 1 FIELD_SUPERVISOR per team (app-level enforcement)
- [ ] FIELD_SUPERVISOR can supervise multiple teams
- [ ] PROJECT assignment requires system role validation
- [ ] Time window enforcement follows policy specifications
- [ ] Supervisor override mechanisms function correctly

### **OE-002: Performance and Scalability Validation**
**Rule:** Ensure system performance meets operational requirements

**Audit Checklist:**
- [ ] Permission checks complete within 50ms target
- [ ] Project assignment queries optimized with proper indexes
- [ ] Geographic boundary validation performs efficiently
- [ ] Audit logging doesn't impact system performance
- [ ] Concurrent access handled appropriately

**Performance Tests:**
```bash
# Run performance benchmarks
npm run audit:performance

# Test concurrent access
npm run test:concurrent-access

# Validate query performance
npm run audit:query-performance
```

---

## **Audit Execution Framework**

### **Automated Audit Commands**

```bash
# Complete system audit
npm run audit:complete

# Individual audit categories
npm run audit:architecture
npm run audit:rbac
npm run audit:project-scoping
npm run audit:geographic-boundaries
npm run audit:security-compliance
npm run audit:data-integrity
npm run audit:operational-effectiveness

# Generate audit report
npm run audit:report

# Continuous monitoring
npm run audit:monitor
```

### **Audit Report Structure**

**Executive Summary:**
- Overall compliance score (0-100%)
- Critical issues requiring immediate attention
- Compliance trends over time
- Risk assessment summary

**Detailed Findings:**
- Category-specific compliance scores
- Failed audit rules with remediation steps
- Performance metrics and benchmarks
- Security vulnerability assessment

**Recommendations:**
- Priority-based action items
- Resource allocation requirements
- Timeline for compliance improvements
- Success metrics and validation criteria

---

## **Audit Success Metrics**

### **Compliance Targets**
- **Architecture Compliance:** e 95%
- **RBAC Effectiveness:** 100%
- **Security Compliance:** 100%
- **Data Integrity:** e 99%
- **Performance Standards:** e 95%

### **Critical Success Factors**
1. **Zero Security Vulnerabilities** - No high-priority security findings
2. **Complete RBAC Coverage** - All roles properly scoped and enforced
3. **Data Consistency** - No orphaned records or relationship violations
4. **Performance Standards** - All response times within target thresholds
5. **Audit Trail Completeness** - 100% audit logging coverage

---

## **Audit Support and Escalation**

### **Audit Execution Support**
- **Database Access:** Read-only access for audit queries
- **API Testing:** Dedicated audit endpoints for validation
- **Log Access:** Comprehensive log file access for security analysis
- **Performance Monitoring:** Real-time system metrics during audit

### **Issue Escalation Matrix**
- **Level 1 (Critical):** Security vulnerabilities, data corruption - Immediate escalation
- **Level 2 (High):** Compliance failures, performance issues - 24-hour escalation
- **Level 3 (Medium):** Documentation gaps, minor inconsistencies - Weekly review
- **Level 4 (Low):** Optimization opportunities, best practice improvements - Monthly review

---

## **Audit Log Requirements**

### **Mandatory Audit Events**
- All authentication and authorization decisions
- Project assignment changes (create, update, delete)
- Role assignment modifications
- Geographic boundary access attempts
- Security policy violations
- System configuration changes

### **Log Format Standards**
```json
{
  "timestamp": "2025-11-17T10:30:00Z",
  "level": "AUDIT",
  "event_type": "PROJECT_ASSIGNMENT_CREATE",
  "user_id": "uuid",
  "action": "CREATE",
  "resource_type": "PROJECT_ASSIGNMENT",
  "resource_id": "uuid",
  "result": "SUCCESS|FAILURE",
  "details": {
    "project_id": "uuid",
    "assigned_user": "uuid",
    "assigned_by": "uuid",
    "ip_address": "192.168.1.100"
  },
  "request_id": "uuid",
  "session_id": "uuid"
}
```

---

**Document Status:**  **Production Ready**
**Next Review Date:** December 17, 2025
**Approval Required:** System Architecture Team, Security Team, Compliance Officer

This audit framework ensures the SurveyLauncher Enterprise Architecture maintains security, compliance, and operational effectiveness while supporting scalable field operations management.