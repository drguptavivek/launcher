#!/usr/bin/env tsx

import { projectPermissionService } from '../src/services/project-permission-service';

async function initializeProjectPermissions() {
  console.log('🚀 Initializing PROJECTS permissions for RBAC system...\n');

  try {
    await projectPermissionService.initializeProjectPermissions();
    console.log('✅ PROJECTS permissions initialized successfully!');

    // Get statistics to verify
    const stats = await projectPermissionService.getPermissionStatistics();
    console.log('\n📊 Permission Statistics:');
    console.log(`   • Total permissions in system: ${stats.totalPermissions}`);
    console.log(`   • PROJECTS permissions created: ${stats.projectPermissions}`);
    console.log(`   • Roles with PROJECTS access: ${stats.rolesWithProjectAccess}`);
    console.log(`   • Active project assignments: ${stats.activeProjectAssignments}`);
    console.log(`   • Active team assignments: ${stats.activeTeamAssignments}`);

    console.log('\n🎉 PROJECTS RBAC Integration Complete!');
    console.log('📋 All 9 roles now have appropriate PROJECTS permissions:');
    console.log('   • TEAM_MEMBER: Read/Execute own assigned projects');
    console.log('   • FIELD_SUPERVISOR: Read/Update team projects');
    console.log('   • REGIONAL_MANAGER: Full regional project management');
    console.log('   • DEVICE_MANAGER: Device management in projects');
    console.log('   • SYSTEM_ADMIN: Full project system access');
    console.log('   • SUPPORT_AGENT: Read-only organizational project access');
    console.log('   • AUDITOR: Audit access to all projects');
    console.log('   • POLICY_ADMIN: Read organizational projects');
    console.log('   • NATIONAL_SUPPORT_ADMIN: Full cross-team project access');

  } catch (error) {
    console.error('❌ Failed to initialize PROJECTS permissions:', error);
    process.exit(1);
  }
}

initializeProjectPermissions();