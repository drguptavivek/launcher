#!/usr/bin/env tsx

/**
 * Default Organizations and Projects Seeding Script
 *
 * Creates the complete set of organizations and projects as defined in the
 * architecture guide. This script ensures the system has the proper
 * organizational structure and project scoping for enterprise operations.
 */

import { db } from '../src/lib/db';
import { organizations, projects, teams, users } from '../src/lib/db/schema';
import { logger } from '../src/lib/logger';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

// Default organizations as per architecture guide
const DEFAULT_ORGANIZATIONS = [
  {
    id: '550e8400-e29b-41d4-a716-446655440100',
    name: 'AIIMS India',
    displayName: 'All India Institute of Medical Sciences',
    description: 'Premier medical education and research institution in India',
    code: 'AIIMS-INDIA',
    isActive: true,
    isDefault: true
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440101',
    name: 'National Health Mission',
    displayName: 'National Health Mission - Ministry of Health',
    description: 'Federal health mission supporting nationwide healthcare initiatives',
    code: 'NHM-INDIA',
    isActive: true,
    isDefault: false
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440102',
    name: 'Delhi State Health Authority',
    displayName: 'Delhi State Health Authority',
    description: 'State-level health authority for Delhi region',
    code: 'DSHA-DL',
    isActive: true,
    isDefault: false
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440103',
    name: 'NDDTC',
    displayName: 'National Drug Dependence Treatment Center',
    description: 'National center for drug dependence treatment and research',
    code: 'NDDTC-INDIA',
    isActive: true,
    isDefault: false
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440104',
    name: 'CDER',
    displayName: 'Center for Dental Education and Research',
    description: 'National center for dental education and research',
    code: 'CDER-INDIA',
    isActive: true,
    isDefault: false
  }
] as const;

// Default projects as per architecture guide
const DEFAULT_PROJECTS = [
  {
    id: '550e8400-e29b-41d4-a716-446655440202',
    title: 'National Drug Use Survey',
    abbreviation: 'NDUS-2025',
    contactPersonDetails: 'Dr. S. K. Mattoo, NDDTC',
    status: 'ACTIVE' as const,
    geographicScope: 'NATIONAL' as const,
    organizationId: '550e8400-e29b-41d4-a716-446655440103', // NDDTC
    regionId: null, // National scope
    description: 'National survey on drug use patterns and treatment seeking behavior'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440203',
    title: 'National Oral Health Survey',
    abbreviation: 'NOHS-2025',
    contactPersonDetails: 'Dr. Mahesh Verma, CDER',
    status: 'ACTIVE' as const,
    geographicScope: 'NATIONAL' as const,
    organizationId: '550e8400-e29b-41d4-a716-446655440104', // CDER
    regionId: null, // National scope
    description: 'Comprehensive national survey on oral health status and dental care access'
  }
] as const;

async function seedOrganizations() {
  try {
    console.log('🏢 Seeding default organizations...');

    for (const org of DEFAULT_ORGANIZATIONS) {
      console.log(`  Creating organization: ${org.displayName}`);

      await db.insert(organizations).values({
        id: org.id,
        name: org.name,
        displayName: org.displayName,
        description: org.description,
        code: org.code,
        isActive: org.isActive,
        isDefault: org.isDefault,
        settings: {},
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }).onConflictDoUpdate({
        target: organizations.id,
        set: {
          name: org.name,
          displayName: org.displayName,
          description: org.description,
          code: org.code,
          isActive: org.isActive,
          isDefault: org.isDefault,
          updatedAt: new Date()
        }
      });
    }

    console.log(`✅ Created ${DEFAULT_ORGANIZATIONS.length} organizations`);
    return DEFAULT_ORGANIZATIONS;

  } catch (error) {
    console.error('❌ Failed to seed organizations:', error);
    logger.error('Organization seeding failed', { error });
    throw error;
  }
}

async function seedProjects() {
  try {
    console.log('📋 Seeding default projects...');

    // Get a SYSTEM_ADMIN user for createdBy field
    const systemAdmin = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'SYSTEM_ADMIN'))
      .limit(1);

    if (systemAdmin.length === 0) {
      throw new Error('No SYSTEM_ADMIN user found. Please seed users first.');
    }

    const createdBy = systemAdmin[0].id;

    // For regional projects, find the appropriate team ID
    let aiimsDelhiTeamId = null;
    try {
      const aiimsDelhiTeam = await db.select({ id: teams.id })
        .from(teams)
        .where(eq(teams.name, 'AIIMS Delhi Survey Team'))
        .limit(1);

      if (aiimsDelhiTeam.length > 0) {
        aiimsDelhiTeamId = aiimsDelhiTeam[0].id;
      }
    } catch (error) {
      console.warn('⚠️  AIIMS Delhi Team not found. Regional projects will not have team assignments.');
    }

    for (const project of DEFAULT_PROJECTS) {
      console.log(`  Creating project: ${project.title}`);

      const projectData = {
        ...project,
        regionId: project.geographicScope === 'REGIONAL' && project.title.includes('Delhi') ? aiimsDelhiTeamId : project.regionId,
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.insert(projects).values(projectData)
        .onConflictDoUpdate({
          target: projects.id,
          set: {
            title: project.title,
            abbreviation: project.abbreviation,
            contactPersonDetails: project.contactPersonDetails,
            status: project.status,
            geographicScope: project.geographicScope,
            organizationId: project.organizationId,
            regionId: projectData.regionId,
            updatedAt: new Date()
          }
        });
    }

    console.log(`✅ Created ${DEFAULT_PROJECTS.length} projects`);
    return DEFAULT_PROJECTS;

  } catch (error) {
    console.error('❌ Failed to seed projects:', error);
    logger.error('Project seeding failed', { error });
    throw error;
  }
}

async function seedDefaultOrganizationsProjects() {
  try {
    console.log('🌱 Starting default organizations and projects seeding...');
    logger.info('Default organizations and projects seeding started');

    // Seed organizations first (required by projects)
    const orgs = await seedOrganizations();

    // Then seed projects
    const projects = await seedProjects();

    console.log('\n✅ Default organizations and projects seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - Organizations created: ${orgs.length}`);
    console.log(`  - Projects created: ${projects.length}`);

    console.log('\n🏢 Organizations:');
    for (const org of orgs) {
      console.log(`  ${org.code} - ${org.displayName}`);
    }

    console.log('\n📋 Projects:');
    for (const project of projects) {
      console.log(`  ${project.abbreviation} - ${project.title} (${project.geographicScope})`);
    }

    logger.info('Default organizations and projects seeding completed', {
      organizationsCreated: orgs.length,
      projectsCreated: projects.length
    });

    return {
      success: true,
      organizationsCreated: orgs.length,
      projectsCreated: projects.length,
      organizations: orgs,
      projects
    };

  } catch (error) {
    console.error('❌ Failed to seed default organizations and projects:', error);
    logger.error('Default organizations and projects seeding failed', { error });
    throw error;
  }
}

async function clearDefaultOrganizationsProjects() {
  try {
    console.log('🧹 Clearing default organizations and projects...');

    // Delete projects first (due to foreign key constraints)
    const projectIds = DEFAULT_PROJECTS.map(p => p.id);
    for (const projectId of projectIds) {
      await db.delete(projects).where(eq(projects.id, projectId));
    }
    console.log(`  ✓ Cleared ${projectIds.length} projects`);

    // Delete organizations
    const organizationIds = DEFAULT_ORGANIZATIONS.map(o => o.id);
    for (const orgId of organizationIds) {
      await db.delete(organizations).where(eq(organizations.id, orgId));
    }
    console.log(`  ✓ Cleared ${organizationIds.length} organizations`);

    console.log('✅ Default organizations and projects cleared successfully!');

  } catch (error) {
    console.error('❌ Failed to clear default organizations and projects:', error);
    logger.error('Default organizations and projects cleanup failed', { error });
    throw error;
  }
}

async function verifyOrganizationsProjects() {
  try {
    console.log('🔍 Verifying organizations and projects...');

    const orgCount = await db.select().from(organizations);
    const projectCount = await db.select().from(projects);

    console.log(`📊 Verification Results:`);
    console.log(`  - Total organizations: ${orgCount.length}`);
    console.log(`  - Total projects: ${projectCount.length}`);

    // Verify each default organization exists
    for (const org of DEFAULT_ORGANIZATIONS) {
      const exists = orgCount.some(o => o.id === org.id);
      console.log(`  ${exists ? '✓' : '❌'} ${org.code} - ${org.displayName}`);
    }

    // Verify each default project exists
    for (const project of DEFAULT_PROJECTS) {
      const exists = projectCount.some(p => p.id === project.id);
      console.log(`  ${exists ? '✓' : '❌'} ${project.abbreviation} - ${project.title}`);
    }

    return {
      organizationsFound: orgCount.length,
      projectsFound: projectCount.length
    };

  } catch (error) {
    console.error('❌ Failed to verify organizations and projects:', error);
    throw error;
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  switch (command) {
    case 'seed':
      seedDefaultOrganizationsProjects()
        .then(() => {
          console.log('\n🎉 Default organizations and projects seeding completed successfully!');
          process.exit(0);
        })
        .catch((error) => {
          console.error('\n💥 Default organizations and projects seeding failed:', error);
          process.exit(1);
        });
      break;

    case 'clear':
      clearDefaultOrganizationsProjects()
        .then(() => {
          console.log('\n🧹 Default organizations and projects cleanup completed successfully!');
          process.exit(0);
        })
        .catch((error) => {
          console.error('\n💥 Default organizations and projects cleanup failed:', error);
          process.exit(1);
        });
      break;

    case 'verify':
      verifyOrganizationsProjects()
        .then(() => {
          console.log('\n✅ Organizations and projects verification completed!');
          process.exit(0);
        })
        .catch((error) => {
          console.error('\n💥 Organizations and projects verification failed:', error);
          process.exit(1);
        });
      break;

    default:
      console.log('Usage:');
      console.log('  tsx scripts/seed-default-organizations-projects.ts seed    - Seed default organizations and projects');
      console.log('  tsx scripts/seed-default-organizations-projects.ts clear   - Clear default organizations and projects');
      console.log('  tsx scripts/seed-default-organizations-projects.ts verify  - Verify organizations and projects');
      console.log('');
      console.log('Organizations:');
      console.log('  - AIIMS India (National)');
      console.log('  - National Health Mission (Federal)');
      console.log('  - Delhi State Health Authority (Regional)');
      console.log('  - NDDTC (National Diabetes Training Center)');
      console.log('  - CDER (Center for Dental Education and Research)');
      console.log('');
      console.log('Projects:');
      console.log('  - National Drug Use Survey (NATIONAL)');
      console.log('  - National Oral Health Survey (NATIONAL)');
      process.exit(1);
  }
}

export {
  seedDefaultOrganizationsProjects,
  clearDefaultOrganizationsProjects,
  verifyOrganizationsProjects
};