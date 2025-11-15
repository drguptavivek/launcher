# Project Management Workflow

## Overview
This document describes the comprehensive project management workflow, showing how users, organizations, and teams are scoped within projects to maintain clear boundaries while enabling flexible collaboration.

## Project Management Architecture Diagram

```mermaid
flowchart TD
    %% Top Level: Organization
    subgraph "Organization" [Organization Scope]
        ORG[SurveyLauncher<br/>National Organization<br/>550e8400-e29b-41d4-a716-446655440000]
    end

    %% Regional Level
    subgraph "Regional Divisions" [Geographic Regions]
        REG1[Region North<br/>Delhi NCR<br/>Regional Manager]
        REG2[Region South<br/>Chennai<br/>Regional Manager]
        REG3[Region East<br/>Kolkata<br/>Regional Manager]
        REG4[Region West<br/>Mumbai<br/>Regional Manager]
    end

    %% Team Level
    subgraph "Operational Teams" [Field Teams]
        T1[Team DL07<br/>AIIMS Delhi<br/>Field Supervisor]
        T2[Team CH01<br/>Chennai Central<br/>Field Supervisor]
        T3[Team KO01<br/>Kolkata Medical<br/>Field Supervisor]
        T4[Team MU01<br/>Mumbai Hospital<br/>Field Supervisor]
        T5[Team DL08<br/>AIIMS Delhi<br/>Field Supervisor]
    end

    %% User Level
    subgraph "Users" [System Users]
        U1[TEAM_MEMBER<br/>Field Surveyor]
        U2[FIELD_SUPERVISOR<br/>Team Lead]
        U3[REGIONAL_MANAGER<br/>Regional Admin]
        U4[SYSTEM_ADMIN<br/>Platform Admin]
        U5[NATIONAL_SUPPORT_ADMIN<br/>National Support]
        U6[SUPPORT_AGENT<br/>Help Desk]
        U7[AUDITOR<br/>Compliance]
        U8[DEVICE_MANAGER<br/>Device Ops]
        U9[POLICY_ADMIN<br/>Policy Mgmt]
    end

    %% Project Level
    subgraph "Projects" [Project Scope Boundaries]
        P1[Project DEL-SURV-01<br/>Geographic: REGIONAL<br/>Scope: Delhi NCR]
        P2[Project NAT-POL-01<br/>Geographic: NATIONAL<br/>Scope: All India]
        P3[Project CH-HEALTH-01<br/>Geographic: REGIONAL<br/>Scope: Chennai]
        P4[Project DEV-OPS-01<br/>Geographic: LOCAL<br/>Scope: Team DL07 Only]
    end

    %% Project Assignments
    subgraph "Project Assignments" [User/Team to Project Mapping]
        PA1[Direct User Assignments<br/>READ, EXECUTE, UPDATE scopes]
        PA2[Team Assignments<br/>READ, PARTICIPATE, MANAGE scopes]
        PA3[Geographic Boundaries<br/>Local/Regional/National enforcement]
        PA4[Cross-Team Access<br/>SYSTEM_ADMIN, NATIONAL_SUPPORT_ADMIN]
    end

    %% Access Control Layer
    subgraph "Access Control" [Multi-Layer Security]
        AC1[RBAC Permissions<br/>Role-based access matrix]
        AC2[Direct Assignments<br/>User-to-project mapping]
        AC3[Team-Based Access<br/>Team-to-project mapping]
        AC4[Geographic Enforcement<br/>Regional boundary validation]
        AC5[Cross-Team Privileges<br/>National admin access]
    end

    %% Connections: Organization to Regions
    ORG --> REG1
    ORG --> REG2
    ORG --> REG3
    ORG --> REG4

    %% Connections: Regions to Teams
    REG1 --> T1
    REG1 --> T5
    REG2 --> T2
    REG3 --> T3
    REG4 --> T4

    %% Connections: Teams to Users
    T1 --> U1
    T1 --> U2
    T2 --> U6
    T3 --> U7
    T4 --> U8
    T5 --> U1

    %% System-level Users
    ORG -.-> U3
    ORG -.-> U4
    ORG -.-> U5
    ORG -.-> U9

    %% Project Creation
    U4 --> P1
    U4 --> P2
    U3 --> P3
    U2 --> P4

    %% Project Assignment Workflows
    P1 --> PA1
    P1 --> PA2
    P2 --> PA3
    P3 --> PA4
    P4 --> PA1

    %% Access Control Integration
    PA1 --> AC1
    PA2 --> AC2
    PA3 --> AC3
    PA4 --> AC4
    PA5 --> AC5

    %% Styling
    style ORG fill:#1e88e5,color:#fff
    style REG1 fill:#43a047,color:#fff
    style REG2 fill:#43a047,color:#fff
    style REG3 fill:#43a047,color:#fff
    style REG4 fill:#43a047,color:#fff
    style T1 fill:#fb8c00,color:#fff
    style T2 fill:#fb8c00,color:#fff
    style T3 fill:#fb8c00,color:#fff
    style T4 fill:#fb8c00,color:#fff
    style T5 fill:#fb8c00,color:#fff
    style P1 fill:#8e24aa,color:#fff
    style P2 fill:#8e24aa,color:#fff
    style P3 fill:#8e24aa,color:#fff
    style P4 fill:#8e24aa,color:#fff
    style AC1 fill:#d32f2f,color:#fff
    style AC2 fill:#d32f2f,color:#fff
    style AC3 fill:#d32f2f,color:#fff
    style AC4 fill:#d32f2f,color:#fff
    style AC5 fill:#d32f2f,color:#fff
```

## Project Access Control Flow Diagram

```mermaid
sequenceDiagram
    participant User as User Request
    participant Auth as Authentication Layer
    participant RBAC as RBAC Service
    participant Project as Project Service
    participant DB as Database
    participant Audit as Audit Logger

    User->>Auth: Request Access to Project
    Auth->>Auth: Validate JWT Token
    Auth->>RBAC: Get User Roles & Permissions

    RBAC->>DB: Query User Roles
    DB-->>RBAC: Return User Roles
    RBAC->>DB: Query Role Permissions
    DB-->>RBAC: Return Permission Matrix

    alt Direct Assignment Check
        RBAC->>Project: Check Direct Assignment
        Project->>DB: Query project_assignments
        DB-->>Project: Return Assignment Details
        Project-->>RBAC: Assignment Found
    else Team Assignment Check
        RBAC->>Project: Check Team Assignment
        Project->>DB: Query project_team_assignments
        DB-->>Project: Return Team Assignment
        Project-->>RBAC: Team Assignment Found
    else Geographic Boundary Check
        RBAC->>Project: Validate Geographic Scope
        Project->>DB: Query Project & Team Locations
        DB-->>Project: Return Geographic Data
        Project-->>RBAC: Geographic Validation Result
    end

    RBAC->>RBAC: Evaluate All Access Factors
    RBAC->>Audit: Log Access Decision
    RBAC-->>User: Grant/Deny Access

    alt Access Granted
        User->>Project: Perform Project Operation
        Project->>DB: Execute Operation
        Project->>Audit: Log Operation
    else Access Denied
        User->>Audit: Log Access Attempt
    end
```

## Project Boundary Enforcement Diagram

```mermaid
flowchart LR
    subgraph "Input" [Access Request]
        REQ[User Access Request<br/>User ID + Project ID + Action]
    end

    subgraph "Layer 1: Authentication" [Auth Layer]
        AUTH[JWT Validation<br/>Session Verification<br/>User Status Check]
    end

    subgraph "Layer 2: Role-Based Access" [RBAC Layer]
        ROLE[Role Permission Matrix<br/>9-Role System<br/>PROJECTS Resource Permissions]
    end

    subgraph "Layer 3: Direct Assignment" [Assignment Layer]
        DIRECT[Direct User Assignment<br/>Scope: READ/EXECUTE/UPDATE<br/>Expiration & Active Status]
    end

    subgraph "Layer 4: Team Assignment" [Team Layer]
        TEAM[Team-Based Access<br/>Scope: READ/PARTICIPATE/MANAGE<br/>Automatic Member Access]
    end

    subgraph "Layer 5: Geographic Boundary" [Geographic Layer]
        GEO[Geographic Scope Validation<br/>LOCAL/REGIONAL/NATIONAL<br/>Regional Authority Check]
    end

    subgraph "Layer 6: Cross-Team Access" [Privilege Layer]
        CROSS[Cross-Team Access<br/>SYSTEM_ADMIN: Full Access<br/>NATIONAL_SUPPORT_ADMIN: Operational Access]
    end

    subgraph "Decision" [Access Decision]
        DECISION[Final Access Determination<br/>Allow/Deny with Reason<br/>Audit Trail Generated]
    end

    subgraph "Output" [Result]
        ALLOW[Access Granted<br/>Project Operation Allowed]
        DENY[Access Denied<br/>Reason Logged]
    end

    %% Flow Connections
    REQ --> AUTH
    AUTH --> ROLE
    ROLE --> DIRECT

    %% Decision branches
    DIRECT --> |Assignment Found| TEAM
    DIRECT --> |No Assignment| GEO

    TEAM --> GEO
    GEO --> CROSS
    CROSS --> DECISION

    %% Final outcomes
    DECISION --> |Granted| ALLOW
    DECISION --> |Denied| DENY

    %% Styling
    style AUTH fill:#e3f2fd
    style ROLE fill:#f3e5f5
    style DIRECT fill:#e8f5e8
    style TEAM fill:#fff8e1
    style GEO fill:#ffebee
    style CROSS fill:#fce4ec
    style DECISION fill:#f5f5f5
    style ALLOW fill:#c8e6c9
    style DENY fill:#ffcdd2
```

## User-Project Assignment Matrix

```mermaid
graph TD
    subgraph "User Roles" [9-Role System]
        TM[TEAM_MEMBER<br/>👤 Basic field staff]
        FS[FIELD_SUPERVISOR<br/>👔 Team supervision]
        RM[REGIONAL_MANAGER<br/>🌍 Regional admin]
        SA[SYSTEM_ADMIN<br/>🔧 Platform admin]
        NSA[NATIONAL_SUPPORT_ADMIN<br/>🇮🇳 National support]
        SP[SUPPORT_AGENT<br/>📞 Help desk]
        AU[AUDITOR<br/>📊 Compliance]
        DM[DEVICE_MANAGER<br/>📱 Device operations]
        PA[POLICY_ADMIN<br/>📜 Policy management]
    end

    subgraph "Project Permissions" [Access Levels]
        READ[📖 READ<br/>View project data]
        LIST[📋 LIST<br/>Browse projects]
        CREATE[➕ CREATE<br/>New projects]
        UPDATE[✏️ UPDATE<br/>Modify projects]
        DELETE[🗑️ DELETE<br/>Remove projects]
        ASSIGN[👥 ASSIGN<br/>Manage assignments]
        EXECUTE[⚡ EXECUTE<br/>Run operations]
        AUDIT[🔍 AUDIT<br/>Review access]
    end

    subgraph "Geographic Scopes" [Boundary Levels]
        LOCAL[🏢 LOCAL<br/>Team/Location only]
        REGIONAL[🗺️ REGIONAL<br/>State/Region level]
        NATIONAL[🇮🇳 NATIONAL<br/>Country-wide]
    end

    %% Permission mappings with examples
    TM --> READ
    TM --> LIST
    TM --> EXECUTE
    TM -.-> |Within Team| LOCAL

    FS --> READ
    FS --> LIST
    FS --> CREATE
    FS --> UPDATE
    FS --> ASSIGN
    FS --> EXECUTE
    FS -.-> |Within Region| REGIONAL

    RM --> READ
    RM --> LIST
    RM --> CREATE
    RM --> UPDATE
    RM --> DELETE
    RM --> ASSIGN
    RM --> EXECUTE
    RM --> AUDIT
    RM -.-> |Region Level| REGIONAL

    SA --> READ
    SA --> LIST
    SA --> CREATE
    SA --> UPDATE
    SA --> DELETE
    SA --> ASSIGN
    SA --> EXECUTE
    SA --> AUDIT
    SA -.-> |All Scopes| NATIONAL

    NSA --> READ
    NSA --> LIST
    NSA --> CREATE
    NSA --> UPDATE
    NSA --> DELETE
    NSA --> ASSIGN
    NSA --> EXECUTE
    NSA --> AUDIT
    NSA -.-> |All Scopes| NATIONAL

    SP --> READ
    SP --> LIST
    SP --> AUDIT

    AU --> READ
    AU --> LIST
    AU --> AUDIT

    DM --> READ
    DM --> LIST
    DM --> AUDIT

    PA --> READ
    PA --> LIST
    PA --> AUDIT

    %% Styling
    style TM fill:#81c784
    style FS fill:#64b5f6
    style RM fill:#ffb74d
    style SA fill:#f06292
    style NSA fill:#ba68c8
    style SP fill:#4db6ac
    style AU fill:#ffd54f
    style DM fill:#9575cd
    style PA fill:#4fc3f7
```

## Project Lifecycle Workflow

```mermaid
stateDiagram-v2
    [*] --> Planning: Project Initiation
    Planning --> Validation: Scope Definition
    Validation --> Creation: Permission Check

    state Creation {
        [*] --> InputValidation
        InputValidation --> GeographicValidation: Scope Check
        GeographicValidation --> RoleValidation: RBAC Check
        RoleValidation --> ProjectCreation: Database Insert
        ProjectCreation --> AssignmentSetup: Initial Assignments
        AssignmentSetup --> [*]
    }

    Creation --> Active: Project Activated

    state Active {
        [*] --> AccessControl
        AccessControl --> UserAssignment: User Management
        AccessControl --> TeamAssignment: Team Management
        UserAssignment --> GeographicEnforcement: Boundary Check
        TeamAssignment --> GeographicEnforcement
        GeographicEnforcement --> AuditLogging: Decision Log
        AuditLogging --> [*]
    }

    Active --> Completion: Project Finished
    Active --> Paused: Temporary Hold
    Active --> Archived: Soft Delete

    Paused --> Active: Resume Project

    Completion --> Archived: Move to Archive
    Archived --> [*]: End of Lifecycle

    note right of Planning
        Business requirements
        Resource planning
        Timeline definition
        Stakeholder identification
    end

    note right of Validation
        Geographic scope validation
        Resource availability check
        Permission verification
        Risk assessment
    end

    note right of Active
        Ongoing operations
        Access management
        Boundary enforcement
        Performance monitoring
    end
```

## Implementation Details

### Project Creation Workflow

1. **Input Validation**
   - Project title and abbreviation validation
   - Geographic scope verification
   - Required metadata completeness

2. **Permission Verification**
   - User role validation against PROJECTS.CREATE
   - Geographic authority check
   - Organization boundary validation

3. **Geographic Scope Rules**
   - **TEAM_MEMBER**: LOCAL projects only (within team)
   - **FIELD_SUPERVISOR**: LOCAL + REGIONAL (within supervised teams)
   - **REGIONAL_MANAGER**: All scopes within region
   - **SYSTEM_ADMIN/NATIONAL_SUPPORT_ADMIN**: All scopes nationally

4. **Database Operations**
   - Unique abbreviation enforcement
   - Creator tracking and audit trail
   - Regional association if applicable

### Access Control Enforcement

1. **Multi-Layer Validation**
   - Authentication layer (JWT + session)
   - RBAC permission matrix
   - Direct assignment check
   - Team assignment verification
   - Geographic boundary validation
   - Cross-team privilege evaluation

2. **Permission Resolution**
   - Role-based base permissions
   - Assignment-specific overrides
   - Geographic scope constraints
   - Cross-team administrative access

3. **Audit and Logging**
   - Access decision logging
   - Boundary violation tracking
   - Assignment change history
   - Geographic access attempts

### Boundary Management

1. **Data Isolation**
   - Project-specific data separation
   - User assignment scoping
   - Team access boundaries

2. **Geographic Enforcement**
   - Regional boundary validation
   - Cross-region access control
   - Location-based project visibility

3. **Temporal Boundaries**
   - Assignment expiration
   - Project lifecycle management
   - Access revocation handling

## Security Considerations

1. **Principle of Least Privilege**
   - Minimum required access only
   - Role-based limitation enforcement
   - Scope-specific access control

2. **Audit Trail**
   - Complete access decision logging
   - Assignment change tracking
   - Boundary violation recording

3. **Dynamic Updates**
   - Real-time permission changes
   - Assignment impact propagation
   - Instant boundary enforcement

4. **Cross-Team Access**
   - Limited to privileged roles
   - Comprehensive audit logging
   - Organizational oversight

## API Integration

The workflow integrates with the following API endpoints:

- `POST /api/v1/projects` - Project creation with boundary validation
- `GET /api/v1/projects` - Project listing with scope filtering
- `POST /api/v1/projects/:id/users` - User assignment with boundary checks
- `POST /api/v1/projects/:id/teams` - Team assignment with geographic validation
- `GET /api/v1/users/:userId/projects` - User project scoping
- `GET /api/v1/teams/:teamId/projects` - Team project boundaries

---

**Last Updated:** November 15, 2025
**Version:** 1.0
**Status:** Production Ready with Complete Project Boundary Management