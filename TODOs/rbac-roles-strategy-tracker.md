- [ ] **Schema & Seed**
  - [ ] Create Drizzle migrations for `roles`, `permissions`, `role_permissions`, `user_role_assignments`
  - [ ] Seed default roles (TEAM_MEMBER … NATIONAL_SUPPORT_ADMIN) and baseline permission maps

- [ ] **Service Foundations**
  - [ ] Implement `RoleService` (CRUD, assignments, permission retrieval)
  - [ ] Implement `AuthorizationService.computeEffectivePermissions` with caching + system-settings awareness

- [ ] **Boundary & Middleware**
  - [ ] Update `TeamBoundaryService` to honor cross-team roles (SYSTEM_ADMIN, NATIONAL_SUPPORT_ADMIN)
  - [ ] Enhance `authenticateToken`, `requirePermission`, `requireTeamAccess`, add `requireSystemSettingPermission`

- [ ] **API Layer**
  - [ ] Add role-management endpoints (create/list/update/delete, assign/revoke roles)
  - [ ] Guard telemetry/policy/support routes with organization-scope permissions
  - [ ] Shield system-setting routes with `requireSystemSettingPermission`

- [ ] **Testing & Validation**
  - [ ] Unit tests for RoleService, AuthorizationService, TeamBoundaryService
  - [ ] Integration tests proving NATIONAL_SUPPORT_ADMIN write access + system-settings denials
  - [ ] Performance check: permission resolution stays <100 ms

- [ ] **Docs & Rollout**
  - [ ] Update admin/operator docs with new roles and boundaries
  - [ ] Draft deployment checklist (migrations, seed scripts, rollback)
