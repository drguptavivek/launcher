The system is designed for project-specific roles, where users can have different roles across different projects. Here's
  how it works:

  📊 Database Schema Design

  1. User Project Assignments (projectAssignments table)

  - projectId: UUID  -- Which project
  - userId: UUID      -- Which user  
  - roleInProject: VARCHAR(100)  -- Role in THIS project
    * Examples: "Project Lead", "Field Coordinator", "Data Analyst", "Survey Manager"
  - assignedBy: UUID -- Who made the assignment
  - assignedUntil: TIMESTAMP -- Temporary assignments
  - isActive: BOOLEAN -- Enable/disable without deleting

  2. Team Project Assignments (projectTeamAssignments table)

  - projectId: UUID    -- Which project
  - teamId: UUID        -- Which team
  - assignedRole: VARCHAR(100)  -- Team's role in THIS project
    * Examples: "Implementation Team", "Support Team", "QA Team"
  - assignedBy: UUID   -- Who made the assignment
  - assignedUntil: TIMESTAMP -- Temporary assignments
  - isActive: BOOLEAN

  🔄 Access Control Logic

  The system determines user permissions through a hierarchical check:

  Step 1: Direct Project Assignment

  // Check if user has direct assignment to project
  const directAssignment = await db.select()
    .from(projectAssignments)
    .where(and(
      eq(projectAssignments.projectId, projectId),
      eq(projectAssignments.userId, userId),
      eq(projectAssignments.isActive, true)
    ));

  Step 2: Team-Based Assignment

  // Check if user's team is assigned to project
  const userTeam = await db.select({ teamId: users.teamId })
    .from(users)
    .where(eq(users.id, userId));

  const teamAssignment = await db.select()
    .from(projectTeamAssignments)
    .where(and(
      eq(projectTeamAssignments.projectId, projectId),
      eq(projectTeamAssignments.teamId, userTeam.teamId),
      eq(projectTeamAssignments.isActive, true)
    ));

  Step 3: System-Wide Role Fallback

  // If no project-specific assignment, check system-wide role
  const systemRole = await projectPermissionService.checkProjectPermission(
    userId,
    'READ',
    projectId
  );

  👥 Example Use Cases

  User: John Doe

  - Project A (National Survey): Project Lead
  - Project B (Regional Health): Data Analyst
  - Project C (Pilot Study): Field Coordinator

  User: Jane Smith

  - Project A (National Survey): Team Member (via team assignment)
  - Project D (Emergency Response): Project Manager

  🎛️ API Examples

  Assign User with Project-Specific Role

  POST /api/v1/projects/{projectId}/assign-user
  {
    "userId": "user-123",
    "roleInProject": "Project Lead",
    "assignedUntil": "2024-12-31T23:59:59Z"  // Optional temporary assignment
  }

  Get User's Projects with Roles

  GET /api/v1/projects/my
  # Returns:
  {
    "projects": [
      {
        "id": "proj-1",
        "title": "National Health Survey",
        "roleInProject": "Project Lead",
        "accessType": "direct"
      },
      {
        "id": "proj-2",
        "title": "Regional Pilot Study",
        "roleInProject": "Data Analyst",
        "accessType": "direct"
      }
    ]
  }

  🔐 Permission Matrix Integration

  The project-specific roles work alongside the system-wide role hierarchy:

  System Roles (9 levels)

  - TEAM_MEMBER → FIELD_SUPERVISOR → REGIONAL_MANAGER → SYSTEM_ADMIN

  Project Roles (unlimited, custom)

  - Project Lead → Field Coordinator → Data Analyst → Survey Manager

  Permission Resolution

  1. Project-specific role determines what they can do in that project
  2. System role determines where they can do it (geographic/scope limits)

  📋 Key Features

  ✅ Flexible Role Naming: Each project can define its own role names✅ Temporary Assignments: Roles can have expiry dates✅ Dual Assignment: Users can
  be assigned individually AND via teams✅ Audit Trail: All assignments track who assigned and when✅ Active/Inactive: Disable roles without deleting
  history✅ Access Control: Permissions checked per-project based on assignment

  This architecture allows for maximum flexibility while maintaining proper security boundaries. A user can be a Project Lead on one project, a Team 
  Member on another, and have no access to a third project - all simultaneously!


⏺ 🚫 What Happens to Users with No Projects?

  Users who are not assigned to any projects have specific behavior based on their system role and the context:

  📋 Default Behavior for Users with No Projects

  1. Project Access Returns Empty

  // From project-service.ts:472-474
  if (allProjectIds.length === 0) {
    return { projects: [], total: 0 };
  }
  - No projects found: Returns empty array
  - No errors: Graceful handling, not treated as an error
  - Total count: 0

  2. System Role-Based Access (Limited)

  Users still have access based on their system-wide roles, but with restrictions:

  🔒 SYSTEM_ADMIN & NATIONAL_SUPPORT_ADMIN

  // Can see all projects organization-wide, but only:
  // - LIST projects (can see project catalog)
  // - CREATE new projects  
  // - Cannot MANAGE/UPDATE/DELETE projects they're not assigned to

  👥 REGIONAL_MANAGER

  // Can see projects in their region, but only:
  // - LIST projects in their geographic scope
  // - CREATE projects in their region
  // - Cannot manage projects they're not assigned to

  👤 TEAM_MEMBER & FIELD_SUPERVISOR

  // Very limited access without project assignment:
  // - Can LIST projects (if they have permission)
  // - Cannot CREATE/UPDATE/DELETE any projects
  // - Cannot see project details or members

  🔐 Permission Matrix for Unassigned Users

  | System Role      | List Projects | Create Projects | View Details  | Manage Projects | Assign Users  |
  |------------------|---------------|-----------------|---------------|-----------------|---------------|
  | SYSTEM_ADMIN     | ✅ (All)       | ✅ (All)         | ❌ (No Access) | ❌ (No Access)   | ❌ (No Access) |
  | REGIONAL_MANAGER | ✅ (Region)    | ✅ (Region)      | ❌ (No Access) | ❌ (No Access)   | ❌ (No Access) |
  | TEAM_MEMBER      | ✅ (Limited)   | ❌               | ❌ (No Access) | ❌ (No Access)   | ❌ (No Access) |
  | FIELD_SUPERVISOR | ✅ (Limited)   | ❌               | ❌ (No Access) | ❌ (No Access)   | ❌ (No Access) |

  📱 API Response Examples

  User with No Projects

  GET /api/v1/projects/my
  # Response:
  {
    "ok": true,
    "projects": [],
    "total": 0
  }

  Trying to Access Project Details

  GET /api/v1/projects/{some-project-id}
  # Response:
  {
    "ok": false,
    "error": {
      "code": "PROJECT_ACCESS_DENIED",
      "message": "Access denied to this project"
    }
  }

  Trying to List All Projects (if has system permission)

  GET /api/v1/projects
  # Response for TEAM_MEMBER:
  {
    "ok": true,
    "projects": [],  // Empty because no project assignments
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 0,
      "totalPages": 0
    }
  }

  🎯 Use Case Scenarios

  New Employee Onboarding

  1. User Created: Has system role (e.g., TEAM_MEMBER)
  2. No Projects Yet: Can see project catalog but can't access details
  3. Manager Assigns: Added to first project with specific role
  4. Access Gained: Can now participate in assigned projects

  Between Project Assignments

  1. Project Ends: User removed from all active projects
  2. Limited Access: Still has login and basic navigation
  3. Can See: Available projects catalog (if system role allows)
  4. Cannot Act: Cannot create, edit, or manage any projects

  System Administrators

  1. Always Has Access: Can create new projects
  2. Can Assign Self: Can assign themselves to any project
  3. Full Control: Once assigned, has full project management capabilities

  ⚠️ Important Considerations

  User Experience

  - No Breaking: Users don't get errors, just empty results
  - Clear Messaging: API responses clearly indicate access limitations
  - Graceful Degradation: System remains usable even without projects

  Security

  - Principle of Least Privilege: No access until explicitly granted
  - Audit Trail: All access attempts are logged
  - Role Boundaries: System roles provide baseline, project assignments provide additional access

  Administrative

  - Easy Management: Users can be created without immediate project assignment
  - Flexibility: Projects can be created independently of user assignments
  - Monitoring: Admins can see users without projects and assign them appropriately

  This design ensures that users are never "stuck" - they always have some level of access based on their system role, but project-specific actions 
  require explicit assignment, maintaining security and clarity.

