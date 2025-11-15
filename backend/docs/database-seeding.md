# Database Seeding for Testing

**Enterprise-Grade Database Seeding System with 9-Role RBAC for Android MDM Testing**
Last Updated: November 16, 2025

## Overview

The SurveyLauncher backend includes a comprehensive database seeding system that generates realistic test data for Android MDM functionality with enterprise-grade role-based access control:

- **Enhanced RBAC Seeding**: Full 9-role system with granular permissions
- **Configurable**: Different data volumes for unit, integration, and load testing
- **Realistic Simulation**: Indian organizational structure, geographic data, Android device simulation
- **Foreign Key Safe**: Proper relationship handling to prevent constraint violations
- **Multi-Tenant Support**: Organization and team scoped role assignments
- **Production Ready**: Scalable test data generation for any test environment

## 🎯 NEW: 9-Role RBAC System

The seeding system now supports the complete enterprise-grade RBAC implementation:

### Field Operations Roles
- **TEAM_MEMBER**: Frontline survey operators
- **FIELD_SUPERVISOR**: On-site supervisors managing field operations
- **REGIONAL_MANAGER**: Multi-team regional oversight

### Technical Operations Roles
- **SYSTEM_ADMIN**: Full system configuration and maintenance
- **SUPPORT_AGENT**: User support and troubleshooting
- **AUDITOR**: Read-only audit access and compliance monitoring

### Specialized Roles
- **DEVICE_MANAGER**: Android device lifecycle management
- **POLICY_ADMIN**: Policy creation and management
- **NATIONAL_SUPPORT_ADMIN**: Cross-team operational access (no system settings)

## 🏢 Realistic Organizational Structure

The seeding system now creates authentic healthcare survey teams based on Indian institutions:

### Primary Test Organization
- **AIIMS Delhi Survey Team** (DL07)
- Realistic employee codes and role distribution
- Geographic-specific data for accurate testing

## Recent Major Updates

### ✅ **November 16, 2025 - Schema Alignment Release**

- **Updated Schema Documentation**: Aligned seeding documentation with current database schema
- **Project Management Integration**: Added support for projects, project_assignments, and project_team_assignments tables
- **Enhanced RBAC System**: Complete 9-role system with granular permissions and multi-tenant support
- **Organization-Based Multi-Tenancy**: Full organization scoping for teams, users, and projects
- **Performance Optimizations**: Strategic indexing and permission caching for <100ms resolution
- **Foreign Key Cascade Enforcement**: Comprehensive cascade behavior for data integrity

### ✅ **November 14, 2025 - RBAC Integration Release**

- **9-Role RBAC System**: Complete migration from 3-role to enterprise 9-role system
- **Realistic Organizational Structure**: AIIMS Delhi based test organization
- **Enhanced Role Distribution**: Proper mapping of field, technical, and specialized roles
- **Fixed User Seeding**: Deterministic credentials for all 9 roles in testing
- **Cross-Team Access Support**: NATIONAL_SUPPORT_ADMIN cross-team functionality
- **System Settings Protection**: RBAC-aware access control for sensitive operations

### ✅ **November 13, 2025 - Production Release**

- **Fixed Faker.js Compatibility**: Updated all deprecated `faker.datatype` methods to `faker.number.int`
- **Foreign Key Resolution**: Fixed constraint violations in `pin_attempts` table
- **Enhanced Error Handling**: Graceful policy signer initialization for testing environments
- **Realistic Indian Data**: Added authentic GPS coordinates and state codes
- **Documentation**: Comprehensive seeding guide with troubleshooting section

## Available Scripts

### 1. Enhanced Test Seeding (Recommended)
`npm run db:seed-test`

Creates comprehensive test data with:
- **Multi-Tenant Organizations**: 1 test organization with proper scoping
- **Teams**: 10 teams with Indian state identification and organization association
- **Devices**: 200 Android devices (20 per team) with team and organization linkage
- **Users**: 500 users (50 per team) with realistic Indian names and RBAC roles
- **Enhanced RBAC**: All 9 enterprise roles with granular permissions
- **Sessions**: 25 active user sessions with proper lifecycle management
- **Telemetry**: 500 telemetry events (GPS, heartbeat, app usage) with device correlation
- **Supervisor PINs**: 30 supervisor PINs with team-based scoping
- **Security**: 200 PIN attempts for rate limiting and lockout testing
- **Project Management**: Sample projects with user and team assignments
- **Permission Cache**: Pre-computed permission caches for performance testing

**Use Case**: Unit testing, integration testing, development environment, RBAC testing

### 3. Heavy Load Seed Script
`npm run db:seed-test-heavy`

Creates large volume data:
- **Organizations**: Multiple test organizations for multi-tenant testing
- **Teams**: 20 teams with organizational scoping
- **Devices**: 50 devices per team (1000 total) with full foreign key relationships
- **Users**: 100 users per team (2000 total) with comprehensive RBAC role distribution
- **Enhanced RBAC**: Full permission matrix with role assignments and permission caching
- **Sessions**: 100 active sessions with realistic activity patterns
- **Telemetry**: 1000 telemetry events with high-volume GPS and heartbeat data
- **Policy Issues**: 5 policy issues per device for policy management testing
- **Security**: 500 PIN attempts for rate limiting and security testing
- **Project Management**: Large-scale project assignments with team and user associations
- **Performance**: Permission cache performance data for load testing

**Use Case**: Load testing, performance testing, multi-tenant stress testing, RBAC performance validation

### 4. Pre-Test Seeding Utility
`tsx scripts/seed-before-tests.ts [environment]`

Automated seeding utility with predefined configurations:

#### Environments:

- **unit** (default): Lightweight data for unit tests
  - 1 organization, 5 teams with organization scoping
  - 10 devices/team, 20 users/team with RBAC roles
  - 100 telemetry events, 10 sessions
  - Basic permission caching and role assignments

- **integration**: Comprehensive data for integration tests
  - 1 organization, 10 teams with full relationships
  - 20 devices/team, 50 users/team with all 9 RBAC roles
  - 500 telemetry events, 25 sessions
  - Complete permission matrix and project assignments

- **load**: Heavy data for load testing
  - Multiple organizations, 20 teams for multi-tenant testing
  - 50 devices/team, 100 users/team with comprehensive RBAC
  - 2000 telemetry events, 100 sessions
  - Full project management and permission cache testing

- **minimal**: Minimal data for quick tests
  - 1 organization, 2 teams with basic scoping
  - 3 devices/team, 5 users/team with essential roles
  - 20 telemetry events, 3 sessions
  - Minimal RBAC and permission setup

**Usage Examples**:
```bash
# Unit test data (default)
tsx scripts/seed-before-tests.ts unit

# Integration test data
tsx scripts/seed-before-tests.ts integration

# Load test data
tsx scripts/seed-before-tests.ts load

# Minimal test data
tsx scripts/seed-before-tests.ts minimal
```

## Custom Configuration

You can customize the data volume using JSON configuration:

```bash
# Custom configuration example
tsx src/lib/seed-test-enhanced.ts seed '{
  "teamsCount": 15,
  "usersPerTeam": 75,
  "devicesPerTeam": 25,
  "telemetryEventsCount": 1500
}'
```

### Configuration Options

```typescript
interface SeedConfig {
  organizationsCount: number;     // Number of organizations to create
  teamsCount: number;             // Number of teams to create
  devicesPerTeam: number;         // Devices per team
  usersPerTeam: number;           // Users per team
  supervisorPinsPerTeam: number;  // Supervisor PINs per team
  activeSessionsCount: number;    // Active sessions
  telemetryEventsCount: number;   // Telemetry events total
  policyIssuesPerDevice: number;  // Policy issues per device
  pinAttemptsCount: number;       // PIN attempts total
  projectsCount: number;          // Number of projects to create
  nationalProjectsCount: number;  // Number of national-level projects
  regionalProjectsCount: number;  // Number of regional-level projects
  projectAssignmentsCount: number; // Number of user project assignments
  projectTeamAssignmentsCount: number; // Number of team project assignments
  roleAssignmentsCount: number;   // Number of role assignments
  permissionCacheEntries: number; // Permission cache entries
  roleHierarchyLevels: number;    // Number of RBAC hierarchy levels (1-9)
  crossTeamRolesEnabled: boolean; // Enable cross-team role testing
  permissionInheritanceEnabled: boolean; // Enable hierarchical permission testing
  projectAccessControlEnabled: boolean; // Enable project-based access control testing
  multiTenantProjectScoping: boolean; // Enable organization-based project isolation
}
```

## Data Generated

### 🏗️ **Seeding Order - Master Entities First**

#### **Phase 1: Core Master Entities (No Dependencies)**
1. **Organizations** - Root multi-tenant containers (no foreign keys)
2. **Roles & Permissions** - RBAC system foundation (static system data)
3. **Default System Settings** - System-wide configuration

#### **Phase 2: Organization-Scoped Entities**
4. **Teams** - Reference organizations (organizations.id foreign key)
5. **Default Devices** - Reference teams (teams.id foreign key)

#### **Phase 3: User Management**
6. **Core System Users** - System admin without organization constraints
7. **Organization Users** - Regular users with team assignments

#### **Phase 4: Dependent Entities**
8. **Projects** - Reference organizations (organizations.id foreign key)
9. **User & Team Project Assignments** - Reference users, teams, projects
10. **Sessions, Telemetry, PIN Attempts** - Reference users, devices

### Organizations
- Multi-tenant support with proper scoping
- Unique organization codes and display names
- Organization-specific settings and metadata
- Active/inactive status management
- Default organization designation for fallback
- **Created First**: No foreign key dependencies

### Teams
- Realistic company names + "Survey Team"
- Organization-based foreign key relationships
- Indian state IDs with geographic relevance
- Indian timezones for accurate scheduling
- Cascade-safe relationships with organization linkage
- Randomly marked as active/inactive
- **Created After**: Organizations exist

### Core System Users (Organization-Independent)
- **SYSTEM_ADMIN**: Created without organization constraints for system management
- **AUDITOR**: Read-only access across all organizations
- **POLICY_ADMIN**: Policy management across all organizations
- **SUPPORT_AGENT**: User support without organization boundaries
- These users can operate across all organizations for system-wide functions

### Devices
- Real Android manufacturer models
- App versions
- Android IDs
- Activity status
- Last seen timestamps
- **Created After**: Teams exist (teams.id foreign key)

### Users (Dual Creation Strategy)

#### **System Users (Organization-Independent)**
- **SYSTEM_ADMIN, AUDITOR, POLICY_ADMIN, SUPPORT_AGENT**: Created without organization constraints
- **teamId**: NULL or special system team for system-wide operations
- **organizationId**: NULL for cross-organization access
- **Purpose**: System administration, auditing, policy management across all organizations
- **Created After**: Organizations and basic system setup

#### **Organization Users (Multi-Tenant)**
- **TEAM_MEMBER, FIELD_SUPERVISOR, REGIONAL_MANAGER**: Created with specific organization assignments
- **NATIONAL_SUPPORT_ADMIN**: Created within organization scope for cross-regional support
- **DEVICE_MANAGER**: Created with organization constraints for device management
- **teamId**: Specific team UUID within organization
- **organizationId**: Organization UUID for multi-tenant scoping
- **Purpose**: Regular operations within organization boundaries
- **Created After**: Teams exist within organizations

- Real Indian names with proper display formatting
- Unique employee codes with team scoping
- Email addresses with organization domain
- **9 Enterprise Roles**: Complete RBAC with hierarchical permissions
  - Field Operations: TEAM_MEMBER, FIELD_SUPERVISOR, REGIONAL_MANAGER
  - Technical Operations: SYSTEM_ADMIN, SUPPORT_AGENT, AUDITOR (org-independent)
  - Specialized: DEVICE_MANAGER, POLICY_ADMIN (org-independent), NATIONAL_SUPPORT_ADMIN
- Secure PINs (6-digit) with Argon2 hashing and salt
- Multi-tenant role assignments with organization and team scoping
- Role hierarchy support with permission inheritance
- Active/inactive status management for user lifecycle

### Supervisor PINs
- **Role-specific override PINs**: Field Supervisor, Regional Manager, System Admin
- 6-digit PINs with hierarchical access levels
- Active/inactive status
- Organization-scoped assignment

### Telemetry Events
- Heartbeat events with battery, signal strength
- GPS events with realistic Indian locations
- App usage events with durations
- Battery events with charging status
- Error events with realistic error messages
- Network events with connection details
- Screen time events

### Policy Issues
- Multiple versions per device
- Realistic policy configurations
- Session time windows
- GPS requirements
- Security restrictions
- App whitelists/blacklists

### Sessions
- Different statuses (open, expired, ended)
- Supervisor overrides
- Token JTI tracking
- Activity timestamps

### PIN Attempts
- Success/failure tracking with detailed audit logs
- Rate limiting data with exponential backoff testing
- IP address tracking for security monitoring
- User and device correlation with cascade-safe relationships
- Attempt type classification (user_pin vs supervisor_pin)
- Timestamp-based attempt frequency analysis

### Enhanced RBAC System
- **Roles**: Complete 9-role system with hierarchy levels
- **Permissions**: Granular permissions with resource, action, and scope
- **Role Assignments**: Multi-tenant role assignments with organization scoping
- **Permission Cache**: Pre-computed effective permissions for performance (<100ms)
- **Role-Permission Mapping**: Junction table with audit trail
- **Context-Aware Access**: Regional, team, and organizational boundaries

### Project Management (Organization-Scoped)
- **Projects**: Created within organization boundaries with soft delete support
  - **National Projects**: Created by system admin for cross-organization visibility
  - **Regional Projects**: Created by regional managers within organization scope
- **Individual Assignments**: Link users to projects with specific roles
- **Team Assignments**: Grant project access to entire teams within organization
- **Geographic Scope**: National vs regional project coverage validation
- **Organization Scoping**: Multi-tenant project isolation via organizations.id foreign key
- **Active Status Management**: Temporary and permanent assignments
- **Created After**: Organizations and users exist (depends on organizations.id and users.id)

## Sample Login Credentials

After running the fixed seeding script, you'll have deterministic test users for all 9 roles:

### Fixed User Credentials (for Unit Testing)

```
🏗️ RBAC Role Hierarchy (9 Roles):

👑 Level 9: SYSTEM_ADMIN
  test004 / admin123 - Test System Admin
  - Full system control and configuration access
  - All resources, all organizations, system settings

🌍 Level 8: NATIONAL_SUPPORT_ADMIN
  test009 / national678 - Test National Support Admin
  - Cross-regional operational support (no system settings)
  - All teams, all regions, national-level oversight

🏢 Level 7: REGIONAL_MANAGER
  test003 / 789012 - Test Regional Manager
  - Multi-team regional management
  - All teams and projects within region

📱 Level 6: DEVICE_MANAGER
  test007 / device012 - Test Device Manager
  - Full device lifecycle management
  - Device provisioning, monitoring, troubleshooting

📋 Level 5: POLICY_ADMIN
  test008 / policy345 - Test Policy Admin
  - Complete policy management
  - Policy creation, updates, enforcement

🔍 Level 4: AUDITOR
  test006 / audit789 - Test Auditor
  - Read-only audit and compliance
  - All resources (read-only), compliance monitoring

👥 Level 3: FIELD_SUPERVISOR
  test002 / 654321 - Test Field Supervisor
  - On-site team and device management
  - Supervisor override capabilities

🛠️ Level 2: SUPPORT_AGENT
  test005 / support456 - Test Support Agent
  - User support and troubleshooting
  - Basic operational support functions

🔧 Level 1: TEAM_MEMBER
  test001 / 123456 - Test Team Member
  - Basic operational access
  - Survey execution, data collection

🔐 Supervisor Override PINs:
  111111 - Field Supervisor Override PIN (Level 3)
  222222 - Regional Manager Override PIN (Level 7)
  333333 - System Administrator Override PIN (Level 9)

📱 Test Device:
  550e8400-e29b-41d4-a716-446655440003 - Test Device 001

👥 Test Team:
  550e8400-e29b-41d4-a716-446655440002 - AIIMS Delhi Survey Team (DL07)

🏢 Test Organization:
  550e8400-e29b-41d4-a716-446655440001 - AIIMS Delhi
```

### Enhanced Seeding Users

For larger test datasets, the enhanced seeding creates realistic users:

```
Enhanced User Credentials:
  1. emp1000 / [PIN] - [Indian Name] (TEAM_MEMBER)
  2. emp1001 / [PIN] - [Indian Name] (FIELD_SUPERVISOR)
  3. emp1002 / [PIN] - [Indian Name] (REGIONAL_MANAGER)
  4. emp1003 / [PIN] - [Indian Name] (SYSTEM_ADMIN)
  ... (and so on for all 9 roles)

Supervisor Override PINs:
  Multiple role-specific PINs for different organizational levels
```

## Cleaning Database

To clear all test data:
```bash
npm run db:clean
```

## 🎯 Fixed Test Credentials (Complete Reference)

### Quick Reference for All Tests

```bash
# Seed fixed users with all 9 roles
npm run db:seed-fixed

# Fixed credentials that work every time
# Use these for unit tests, integration tests, and API testing
```

### 🏗️ Complete RBAC Role Matrix

#### 👑 **Level 9: SYSTEM_ADMIN**
| User Code | PIN | Password | Role | Display Name | User ID | Organization ID | Scope |
|-----------|-----|----------|------|--------------|---------|----------------|-------|
| test004 | admin123 | SystemAdminPass! | SYSTEM_ADMIN | Test System Admin | 550e8400-e29b-41d4-a716-446655440006 | 550e8400-e29b-41d4-a716-446655440001 | Full System Access |

#### 🌍 **Level 8: NATIONAL_SUPPORT_ADMIN**
| User Code | PIN | Password | Role | Display Name | User ID | Organization ID | Scope |
|-----------|-----|----------|------|--------------|---------|----------------|-------|
| test009 | national678 | NationalSupportPass! | NATIONAL_SUPPORT_ADMIN | Test National Support Admin | 550e8400-e29b-41d4-a716-446655440011 | 550e8400-e29b-41d4-a716-446655440001 | Cross-Regional Support |

#### 🏢 **Level 7: REGIONAL_MANAGER**
| User Code | PIN | Password | Role | Display Name | User ID | Organization ID | Scope |
|-----------|-----|----------|------|--------------|---------|----------------|-------|
| test003 | 789012 | RegionalManagerPass! | REGIONAL_MANAGER | Test Regional Manager | 550e8400-e29b-41d4-a716-446655440005 | 550e8400-e29b-41d4-a716-446655440001 | Multi-Team Regional |

#### 📱 **Level 6: DEVICE_MANAGER**
| User Code | PIN | Role | Display Name | User ID | Organization ID | Scope |
|-----------|-----|------|--------------|---------|----------------|-------|
| test007 | device012 | DEVICE_MANAGER | Test Device Manager | 550e8400-e29b-41d4-a716-446655440009 | 550e8400-e29b-41d4-a716-446655440001 | Full Device Lifecycle |

#### 📋 **Level 5: POLICY_ADMIN**
| User Code | PIN | Role | Display Name | User ID | Organization ID | Scope |
|-----------|-----|------|--------------|---------|----------------|-------|
| test008 | policy345 | POLICY_ADMIN | Test Policy Admin | 550e8400-e29b-41d4-a716-446655440010 | 550e8400-e29b-41d4-a716-446655440001 | Policy Management |

#### 🔍 **Level 4: AUDITOR**
| User Code | PIN | Role | Display Name | User ID | Organization ID | Scope |
|-----------|-----|------|--------------|---------|----------------|-------|
| test006 | audit789 | AUDITOR | Test Auditor | 550e8400-e29b-41d4-a716-446655440008 | 550e8400-e29b-41d4-a716-446655440001 | Read-Only Audit |

#### 👥 **Level 3: FIELD_SUPERVISOR**
| User Code | PIN | Role | Display Name | User ID | Organization ID | Scope |
|-----------|-----|------|--------------|---------|----------------|-------|
| test002 | 654321 | FIELD_SUPERVISOR | Test Field Supervisor | 550e8400-e29b-41d4-a716-446655440004 | 550e8400-e29b-41d4-a716-446655440001 | Team & Device Management |

#### 🛠️ **Level 2: SUPPORT_AGENT**
| User Code | PIN | Role | Display Name | User ID | Organization ID | Scope |
|-----------|-----|------|--------------|---------|----------------|-------|
| test005 | support456 | SUPPORT_AGENT | Test Support Agent | 550e8400-e29b-41d4-a716-446655440007 | 550e8400-e29b-41d4-a716-446655440001 | User Support |

#### 🔧 **Level 1: TEAM_MEMBER**
| User Code | PIN | Password | Role | Display Name | User ID | Organization ID | Scope |
|-----------|-----|----------|------|--------------|---------|----------------|-------|
| test001 | 123456 | TestPass123! | TEAM_MEMBER | Test Team Member | 550e8400-e29b-41d4-a716-446655440003 | 550e8400-e29b-41d4-a716-446655440001 | Basic Operations |

### 🔐 Supervisor Override PINs

| PIN | Level | Name | PIN ID | Override Scope |
|-----|-------|------|--------|----------------|
| 111111 | 3 | Field Supervisor Override PIN | 550e8400-e29b-41d4-a716-446655440006 | Team Level Override |
| 222222 | 7 | Regional Manager Override PIN | 550e8400-e29b-41d4-a716-446655440007 | Regional Level Override |
| 333333 | 9 | System Administrator Override PIN | 550e8400-e29b-41d4-a716-446655440008 | System Level Override |

### 🏢 Complete Organization Structure

#### **Organization Details**
| Field | Value | Description |
|-------|-------|-------------|
| **Organization ID** | `550e8400-e29b-41d4-a716-446655440001` | Primary organization identifier |
| **Name** | AIIMS Delhi | All India Institute of Medical Sciences Delhi |
| **Display Name** | AIIMS Delhi National Health Survey | Human-readable organization name |
| **Code** | AIIMS_NHS | Unique organization code |
| **Type** | HEALTHCARE | Organization classification |
| **Is Default** | true | Default organization for fallback |
| **Is Active** | true | Organization status |
| **Settings** | `{}` | Organization-specific configuration |
| **Metadata** | `{}` | Additional organization metadata |

#### **Team Details**
| Field | Value | Description |
|-------|-------|-------------|
| **Team ID** | `550e8400-e29b-41d4-a716-446655440002` | Primary team identifier |
| **Name** | AIIMS Delhi Survey Team | Team display name |
| **State ID** | DL07 | Delhi state code |
| **Timezone** | Asia/Kolkata | Team timezone for scheduling |
| **Organization ID** | `550e8400-e29b-41d4-a716-446655440001` | Parent organization |
| **Is Active** | true | Team status |

#### **Foreign Key Relationships**
| Entity | ID | References | Cascade Behavior |
|--------|----|------------|-----------------|
| **Organization** | `550e8400-e29b-41d4-a716-446655440001` | None (root entity) | Cascade to all child entities |
| **Team** | `550e8400-e29b-41d4-a716-446655440002` | `organizations.id` | Team deletion cascades to users, devices, etc. |
| **Device** | `550e8400-e29b-41d4-a716-446655440003` | `teams.id` | Device deletion cascades to sessions, telemetry |
| **All Users** | Various IDs | `teams.id` (via team assignment) | User deletion cascades to roles, sessions |

### 📱 Device, Team & Organization Information

| Type | ID | Name | Context | Purpose |
|------|----|------|---------|---------|
| Organization | 550e8400-e29b-41d4-a716-446655440001 | AIIMS Delhi | National Healthcare Institution | Multi-tenant container |
| Team | 550e8400-e29b-41d4-a716-446655440002 | AIIMS Delhi Survey Team | DL07, Asia/Kolkata | Field operations unit |
| Device | 550e8400-e29b-41d4-a716-446655440003 | Test Device 001 | Android test device | Testing and development |

**Complete Relationship Map**:
- **Organization**: `550e8400-e29b-41d4-a716-446655440001` (Root multi-tenant container)
  - **Team**: `550e8400-e29b-41d4-a716-446655440002` → belongs to organization
    - **Device**: `550e8400-e29b-41d4-a716-446655440003` → belongs to team
    - **Projects**: Various IDs → belong to organization (via organization_id)
    - **All Users** → belong to team (inherit organization via team)
    - **Project Assignments** → link users to projects within organization
    - **Supervisor PINs** → belong to team (inherit organization via team)
    - **Sessions** → belong to team (inherit organization via team)
    - **Telemetry Events** → belong to device (inherit org via device→team)
    - **Policy Issues** → belong to device (inherit org via device→team)

### 📋 Project Management Structure

#### **National Projects**
| Project ID | Title | Abbreviation | Status | Geographic Scope | Organization ID | Created By |
|------------|-------|--------------|--------|------------------|------------------|------------|
| 550e8400-e29b-41d4-a716-446655440020 | National Health Survey 2024 | NHS2024 | ACTIVE | NATIONAL | 550e8400-e29b-41d4-a716-446655440001 | 550e8400-e29b-41d4-a716-446655440006 |
| 550e8400-e29b-41d4-a716-446655440021 | COVID-19 Impact Assessment | COV19-IA | ACTIVE | NATIONAL | 550e8400-e29b-41d4-a716-446655440001 | 550e8400-e29b-41d4-a716-446655440006 |

#### **Regional Projects**
| Project ID | Title | Abbreviation | Status | Geographic Scope | Organization ID | Region ID | Created By |
|------------|-------|--------------|--------|------------------|------------------|----------|------------|
| 550e8400-e29b-41d4-a716-446655440030 | Delhi Urban Health Survey | DUHS2024 | ACTIVE | REGIONAL | 550e8400-e29b-41d4-a716-446655440001 | DL07 | 550e8400-e29b-41d4-a716-446655440005 |
| 550e8400-e29b-41d4-a716-446655440031 | Delhi Rural Health Assessment | DRHA2024 | ACTIVE | REGIONAL | 550e8400-e29b-41d4-a716-446655440001 | DL07 | 550e8400-e29b-41d4-a716-446655440005 |

#### **Project Details Template**
| Field | Description |
|-------|-------------|
| **Project ID** | UUID-based primary key for project identification |
| **Title** | Full project name for human reference |
| **Abbreviation** | Short project code (max 50 chars, unique) |
| **Contact Person Details** | Project coordinator information |
| **Status** | ACTIVE/INACTIVE project status |
| **Geographic Scope** | NATIONAL/REGIONAL project coverage |
| **Region ID** | Link to teams table for regional projects |
| **Organization ID** | Multi-tenant organization scoping |
| **Created By** | User ID of project creator |
| **Created At** | Project creation timestamp |
| **Deleted At** | Soft delete support (nullable) |

#### **Individual User Project Assignments**
| User ID | Project ID | Role in Project | Assigned By | Assigned At | Status |
|---------|------------|----------------|------------|------------|--------|
| 550e8400-e29b-41d4-a716-446655440003 | 550e8400-e29b-41d4-a716-446655440020 | Field Enumerator | 550e8400-e29b-41d4-a716-446655440004 | 2025-01-15T10:00:00Z | ACTIVE |
| 550e8400-e29b-41d4-a716-446655440004 | 550e8400-e29b-41d4-a716-446655440020 | Field Supervisor | 550e8400-e29b-41d4-a716-446655440005 | 2025-01-15T09:30:00Z | ACTIVE |
| 550e8400-e29b-41d4-a716-446655440005 | 550e8400-e29b-41d4-a716-446655440030 | Regional Manager | 550e8400-e29b-41d4-a716-446655440006 | 2025-01-14T14:00:00Z | ACTIVE |

#### **Team-Based Project Assignments**
| Team ID | Project ID | Assigned Role | Assigned By | Assigned At | Status |
|---------|------------|--------------|------------|------------|--------|
| 550e8400-e29b-41d4-a716-446655440002 | 550e8400-e29b-41d4-a716-446655440020 | Implementation Team | 550e8400-e29b-41d4-a716-446655440005 | 2025-01-15T08:00:00Z | ACTIVE |
| 550e8400-e29b-41d4-a716-446655440002 | 550e8400-e29b-41d4-a716-446655440030 | Data Collection Team | 550e8400-e29b-41d4-a716-446655440005 | 2025-01-14T15:30:00Z | ACTIVE |

#### **Project Foreign Key Relationships**
| Entity | References | Cascade Behavior |
|--------|------------|-----------------|
| **projects.organization_id** | `organizations.id` | Organization deletion cascades to projects |
| **projects.region_id** | `teams.id` | Team deletion sets project.region_id to NULL |
| **projects.created_by** | `users.id` | User deletion sets project.created_by to NULL |
| **project_assignments.project_id** | `projects.id` | Project deletion cascades to assignments |
| **project_assignments.user_id** | `users.id` | User deletion cascades to assignments |
| **project_assignments.assigned_by** | `users.id` | User deletion sets assigned_by to NULL |
| **project_team_assignments.project_id** | `projects.id` | Project deletion cascades to team assignments |
| **project_team_assignments.team_id** | `teams.id` | Team deletion cascades to team assignments |

#### **Project Access Control Matrix**
| Role | National Projects | Regional Projects | Team Projects | Project Management |
|------|------------------|------------------|---------------|------------------|
| **SYSTEM_ADMIN** | ✅ Full CRUD | ✅ Full CRUD | ✅ Full CRUD | ✅ Full Management |
| **NATIONAL_SUPPORT_ADMIN** | ✅ Full Access | ✅ Full Access | ✅ Full Access | ✅ Support Operations |
| **REGIONAL_MANAGER** | ✅ Read Access | ✅ Full CRUD | ✅ Full CRUD | ✅ Regional Management |
| **FIELD_SUPERVISOR** | ❌ No Access | ✅ Read Access | ✅ Full CRUD | ✅ Team Coordination |
| **TEAM_MEMBER** | ❌ No Access | ❌ No Access | ✅ Assigned Projects | ❌ Limited to Execution |
| **DEVICE_MANAGER** | ✅ Read Access | ✅ Read Access | ✅ Read Access | ✅ Device Configuration |
| **POLICY_ADMIN** | ✅ Read Access | ✅ Read Access | ✅ Read Access | ✅ Policy Management |
| **AUDITOR** | ✅ Read-Only | ✅ Read-Only | ✅ Read-Only | ✅ Audit Access |
| **SUPPORT_AGENT** | ✅ Read Access | ✅ Read Access | ✅ Read Access | ✅ User Support |

### 🔐 Enhanced RBAC Context & Permissions

| Role | Hierarchy Level | Cross-Team Access | System Settings | Key Capabilities |
|------|----------------|------------------|-----------------|------------------|
| **SYSTEM_ADMIN** | 9 | ✅ All Organizations | ✅ Full System Access | Role management, org settings |
| **NATIONAL_SUPPORT_ADMIN** | 8 | ✅ All Teams | ❌ No System Access | Cross-regional support |
| **REGIONAL_MANAGER** | 7 | ✅ Regional Teams | ❌ No System Access | Multi-team oversight |
| **DEVICE_MANAGER** | 6 | ✅ Technical Teams | ❌ No System Access | Device lifecycle |
| **POLICY_ADMIN** | 5 | ✅ Policy Scope | ❌ No System Access | Policy management |
| **AUDITOR** | 4 | ✅ Read-Only Access | ❌ No System Access | Compliance monitoring |
| **FIELD_SUPERVISOR** | 3 | ✅ Assigned Teams | ❌ No System Access | Team management |
| **SUPPORT_AGENT** | 2 | ✅ Support Scope | ❌ No System Access | User troubleshooting |
| **TEAM_MEMBER** | 1 | ❌ Personal Only | ❌ No System Access | Basic operations |

### 🚀 Usage Examples

```bash
# Test login with different roles (using updated device/team IDs)
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "550e8400-e29b-41d4-a716-446655440003",
    "team_id": "550e8400-e29b-41d4-a716-446655440002",
    "user_code": "test001",
    "pin": "123456"
  }'

# Test cross-team access with NATIONAL_SUPPORT_ADMIN
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "550e8400-e29b-41d4-a716-446655440003",
    "team_id": "550e8400-e29b-41d4-a716-446655440002",
    "user_code": "test009",
    "pin": "national678"
  }'

# Test supervisor override
curl -X POST http://localhost:3000/api/v1/supervisor/override/login \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "550e8400-e29b-41d4-a716-446655440003",
    "team_id": "550e8400-e29b-41d4-a716-446655440002",
    "pin": "111111",
    "reason": "Field emergency access"
  }'

# Test RBAC-protected endpoints
curl -X GET http://localhost:3000/api/v1/projects \
  -H "Authorization: Bearer [JWT_TOKEN]" \
  -H "Content-Type: application/json"

# Test project access with specific project ID
curl -X GET http://localhost:3000/api/v1/projects/550e8400-e29b-41d4-a716-446655440020 \
  -H "Authorization: Bearer [JWT_TOKEN]"

# Test project assignment (requires appropriate permissions)
curl -X POST http://localhost:3000/api/v1/projects/550e8400-e29b-41d4-a716-446655440020/members \
  -H "Authorization: Bearer [MANAGER_JWT_TOKEN]" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440003",
    "roleInProject": "Field Enumerator"
  }'
```

## 🎯 RBAC Testing Scenarios

The seeding system supports comprehensive RBAC testing scenarios:

### Role-Based Access Testing
```bash
# Seed all 9 hierarchical roles for permission testing
npm run db:seed-fixed

# Test hierarchical role-specific access patterns
# Level 9 SYSTEM_ADMIN: Full system control, organization management, role assignments
# Level 8 NATIONAL_SUPPORT_ADMIN: Cross-regional operational support (no system settings)
# Level 7 REGIONAL_MANAGER: Multi-team regional management and organization updates
# Level 6 DEVICE_MANAGER: Full device lifecycle and technical support
# Level 5 POLICY_ADMIN: Complete policy management and compliance rules
# Level 4 AUDITOR: Read-only audit access across all resources
# Level 3 FIELD_SUPERVISOR: Team and device management with supervisor overrides
# Level 2 SUPPORT_AGENT: User support and basic troubleshooting
# Level 1 TEAM_MEMBER: Basic operational access and survey execution
```

### Multi-Tenant Boundary Testing
```bash
# Organization-based isolation testing
# - Users are properly scoped to their organization
# - Cross-organization access is properly blocked
# - National Support Admin respects organizational boundaries
# - Permission cache respects organization scoping
```

### Cross-Team Access Testing
```bash
# NATIONAL_SUPPORT_ADMIN cross-team access validation
# - Can access telemetry across all teams within organization
# - Cannot access system settings or other organizations
# - Respects team boundaries for sensitive user operations
# - Proper audit logging for cross-team access
```

### Permission Inheritance & Hierarchy Testing
```bash
# Test complete role hierarchy and permission inheritance
# Level 9 SYSTEM_ADMIN inherits ALL permissions from lower levels + system settings
# Level 8 NATIONAL_SUPPORT_ADMIN inherits operational permissions across all regions
# Level 7 REGIONAL_MANAGER inherits Field Supervisor permissions + team management
# Level 6 DEVICE_MANAGER inherits technical permissions from lower levels
# Level 5 POLICY_ADMIN inherits base permissions + policy management
# Level 4 AUDITOR inherits read-only access to all resources
# Level 3 FIELD_SUPERVISOR inherits Team Member permissions + device/user management
# Level 2 SUPPORT_AGENT inherits Team Member permissions + support capabilities
# Level 1 TEAM_MEMBER has base operational permissions

# Permission cache validation
# - Cache properly reflects hierarchical permissions
# - Inheritance chains resolve in <100ms
# - Role assignments respect organizational and team boundaries
# - Cross-level access patterns work correctly
```

### Project Management Access Testing
```bash
# Project-based access control validation
# National Projects (550e8400-e29b-41d4-a716-446655440020, 550e8400-e29b-41d4-a716-446655440021):
# - SYSTEM_ADMIN: Full CRUD access
# - NATIONAL_SUPPORT_ADMIN: Full operational access
# - REGIONAL_MANAGER: Read-only access
# - FIELD_SUPERVISOR/TEAM_MEMBER: No access (unless specifically assigned)

# Regional Projects (550e8400-e29b-41d4-a716-446655440030, 550e8400-e29b-41d4-a716-446655440031):
# - SYSTEM_ADMIN: Full CRUD access
# - REGIONAL_MANAGER: Full CRUD for regional projects
# - FIELD_SUPERVISOR: Read access + team coordination
# - TEAM_MEMBER: Access only to assigned projects
# - Team assignments provide project access to all team members
# - Project scoping respects organizational boundaries (550e8400-e29b-41d4-a716-446655440001)
# - Soft delete functionality preserves project audit trails
```

## Integration with Test Runners

### Vitest Setup

Add to `vitest.config.ts` or test setup:

```typescript
// Before all tests
import { exec } from 'child_process';

async function setupTestDatabase() {
  return new Promise((resolve, reject) => {
    exec('tsx scripts/seed-before-tests.ts unit', (error, stdout, stderr) => {
      if (error) reject(error);
      resolve(stdout);
    });
  });
}

// Run before all test suites
beforeAll(async () => {
  await setupTestDatabase();
}, 30000); // 30 second timeout

// Optional: Clean up after tests
afterAll(async () => {
  // Clean up test data if needed
  // exec('npm run db:clean');
}, 10000);
```

### Jest Setup

Add to `jest.config.js` or test setup:

```javascript
const { exec } = require('child_process');

// Global setup
exports.globalSetup = async () => {
  await new Promise((resolve, reject) => {
    exec('tsx scripts/seed-before-tests.ts integration', (error, stdout, stderr) => {
      if (error) reject(error);
      resolve(stdout);
    });
  });
};
```

## Performance Considerations

- **Unit Tests**: Use `minimal` environment for fastest execution
- **Integration Tests**: Use `unit` or `integration` environment
- **Load Testing**: Use `load` environment with high volumes
- **CI/CD**: Use appropriate environment based on test type

## Troubleshooting

### Connection Issues
- Ensure Docker PostgreSQL container is running
- Verify DATABASE_URL environment variable
- Check database credentials

### Memory Issues
- Reduce data volume for memory-constrained environments
- Use `minimal` configuration
- Consider running with increased memory limits

### Timeout Issues
- Increase timeout values in test runners
- Use smaller data volumes
- Ensure adequate system resources

## Best Practices

1. **Isolate Test Data**: Always clean and reseed before test runs
2. **Use Appropriate Volumes**: Match data volume to test requirements
3. **Document Test Data**: Record which credentials work for each test
4. **Version Control**: Don't commit actual PINs or sensitive data
5. **CI/CD Integration**: Configure automated seeding in pipelines

## Examples

### Seed for Unit Tests
```bash
# Clean and seed minimal data
npm run db:clean
tsx scripts/seed-before-tests.ts minimal

# Run tests
npm test
```

### Seed for Integration Tests
```bash
# Clean and seed comprehensive data
npm run db:clean
tsx scripts/seed-before-tests.ts integration

# Run integration tests
npm run test:api
```

### Custom Configuration (Master-Entity-First)
```bash
# Seed with custom configuration (master entities first, then dependents)
tsx src/lib/seed-test-enhanced.ts seed '{
  "organizationsCount": 2,
  "teamsCount": 5,
  "usersPerTeam": 15,
  "devicesPerTeam": 8,
  "telemetryEventsCount": 200,
  "nationalProjectsCount": 3,
  "regionalProjectsCount": 7,
  "projectAssignmentsCount": 25,
  "projectTeamAssignmentsCount": 15,
  "roleAssignmentsCount": 50,
  "permissionCacheEntries": 25,
  "systemUserMode": "cross-organization",
  "projectAccessControl": true
}'
```

### Performance Testing with Proper Seeding Order
```bash
# Heavy load with master-entity-first approach
tsx src/lib/seed-test-enhanced.ts seed '{
  "organizationsCount": 5,
  "teamsCount": 50,
  "usersPerTeam": 100,
  "devicesPerTeam": 40,
  "telemetryEventsCount": 5000,
  "nationalProjectsCount": 10,
  "regionalProjectsCount": 40,
  "projectAssignmentsCount": 500,
  "projectTeamAssignmentsCount": 200,
  "roleAssignmentsCount": 1000,
  "permissionCacheEntries": 500,
  "systemUserMode": "cross-organization",
  "projectAccessControl": true,
  "seedingOrder": "master-first"
}'
```

### Configuration Options for Seeding Strategy
```typescript
interface SeedConfig {
  // Master Entity Configuration
  organizationsCount: number;     // Created first (no dependencies)
  teamsCount: number;             // Created after organizations
  devicesPerTeam: number;         // Created after teams

  // User Creation Strategy
  systemUserMode: "cross-organization" | "organization-scoped"; // How to handle system users
  usersPerTeam: number;           // Organization-scoped users only

  // Project Creation (depends on organizations)
  nationalProjectsCount: number;  // Created by system admin
  regionalProjectsCount: number;  // Created by regional managers

  // Assignment Creation (depends on users, teams, projects)
  projectAssignmentsCount: number; // User-to-project assignments
  projectTeamAssignmentsCount: number; // Team-to-project assignments
  roleAssignmentsCount: number;   // RBAC role assignments

  // Dependency Control
  seedingOrder: "master-first" | "bulk"; // Force proper dependency order
  validateForeignKeys: boolean;      // Ensure referential integrity

  // Testing Features
  permissionInheritanceEnabled: boolean;
  projectAccessControlEnabled: boolean;
  multiTenantProjectScoping: boolean;
}
```

## 🏢 Schema-Aligned Seeding Features

### 🏗️ **Master-Entity-First Seeding Strategy**
- **Dependency-Order Creation**: Organizations → Teams → Users → Projects → Assignments
- **Foreign Key Safety**: All dependent entities created after their references exist
- **Validation**: Built-in referential integrity checking
- **Idempotent Operations**: Safe re-seeding with proper cleanup

### Multi-Tenant Organization Support
- **Organization Scoping**: All data properly scoped to organizations
- **Cross-Organization Isolation**: Proper boundary enforcement between organizations
- **Default Organization**: Fallback organization for testing convenience

### **Dual User Creation Strategy**
- **System Users**: Cross-organization users (SYSTEM_ADMIN, AUDITOR, POLICY_ADMIN, SUPPORT_AGENT)
  - **teamId**: NULL or system team for system-wide operations
  - **organizationId**: NULL for cross-organization access
- **Organization Users**: Multi-tenant users within organization boundaries
  - **teamId**: Specific team UUID within organization
  - **organizationId**: Organization UUID for scoping

### Enhanced RBAC Integration
- **9-Role System**: Complete enterprise-grade role hierarchy
- **Granular Permissions**: Resource-action-scope permission matrix
- **Permission Caching**: Pre-computed effective permissions for performance testing
- **Role Assignments**: Multi-tenant role assignments with context boundaries

### Project Management Testing
- **Organization-Scoped Projects**: Created within specific organization boundaries
- **Creation Dependencies**: Projects depend on organizations and users
- **National vs Regional**: Different project types with different access patterns
- **Assignment Testing**: Individual and team-based project assignments
- **Soft Delete Support**: Audit trail preservation with deleted_at timestamps

### Cascade-Safe Relationships
- **Foreign Key Enforcement**: All relationships respect database constraints
- **Cascade Behavior**: Proper data cleanup and integrity maintenance
- **Null on Delete**: Preserves audit trails while maintaining referential integrity
- **Index Optimization**: Strategic indexing for performance testing

### Test Reliability Improvements
- **Deterministic Credentials**: Same usernames and PINs across test runs
- **Idempotent Operations**: Safe to run multiple times without conflicts
- **Clean Test Isolation**: Fixed test data that persists between test runs
- **Performance Validation**: Permission cache and RBAC performance benchmarks
- **Dependency Validation**: Ensures foreign key constraints are satisfied during seeding

This comprehensive seeding system provides realistic, multi-tenant test data that aligns with the current database schema while remaining configurable and performant for all testing scenarios.