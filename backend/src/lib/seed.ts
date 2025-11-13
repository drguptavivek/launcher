import { db } from './db';
import { teams, devices, users, userPins, supervisorPins } from './db/schema';
import { hashPassword, getPolicyPublicKey } from './crypto';
import { env } from './config';
import { eq } from 'drizzle-orm';

/**
 * Seed the database with sample data
 */
export async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  try {
    // Create sample team
    const teamId = 't_012';
    const [team] = await db.insert(teams).values({
      id: teamId,
      name: 'Sample Survey Team',
      timezone: 'Asia/Kolkata',
    }).onConflictDoUpdate({
      target: teams.id,
      set: {
        name: 'Sample Survey Team',
        timezone: 'Asia/Kolkata',
        updatedAt: new Date(),
      },
    }).returning();

    console.log(`✅ Team created/updated: ${team.name} (${team.id})`);

    // Create sample device
    const deviceId = 'dev-mock-001';
    const [device] = await db.insert(devices).values({
      id: deviceId,
      teamId,
      name: 'Sample Android Device',
      isActive: true,
    }).onConflictDoUpdate({
      target: devices.id,
      set: {
        name: 'Sample Android Device',
        isActive: true,
        updatedAt: new Date(),
      },
    }).returning();

    console.log(`✅ Device created/updated: ${device.name} (${device.id})`);

    // Create sample user
    const userId = 'user-mock-001';
    const [user] = await db.insert(users).values({
      id: userId,
      code: 'u001',
      teamId,
      displayName: 'Mock User',
      isActive: true,
    }).onConflictDoUpdate({
      target: users.id,
      set: {
        displayName: 'Mock User',
        isActive: true,
        updatedAt: new Date(),
      },
    }).returning();

    console.log(`✅ User created/updated: ${user.displayName} (${user.id})`);

    // Create user PIN (123456)
    const userPinHash = await hashPassword('123456');
    await db.insert(userPins).values({
      userId,
      pinHash: userPinHash.hash,
      salt: userPinHash.salt,
      retryCount: 0,
    }).onConflictDoUpdate({
      target: userPins.userId,
      set: {
        pinHash: userPinHash.hash,
        salt: userPinHash.salt,
        retryCount: 0,
        updatedAt: new Date(),
      },
    });

    console.log('✅ User PIN created (123456)');

    // Create supervisor PIN (789012)
    const supervisorPinId = 'sup-mock-001';
    const supervisorPinHash = await hashPassword('789012');
    const [supervisorPin] = await db.insert(supervisorPins).values({
      id: supervisorPinId,
      teamId,
      name: 'Sample Supervisor',
      pinHash: supervisorPinHash.hash,
      salt: supervisorPinHash.salt,
      isActive: true,
    }).onConflictDoUpdate({
      target: supervisorPins.id,
      set: {
        name: 'Sample Supervisor',
        pinHash: supervisorPinHash.hash,
        salt: supervisorPinHash.salt,
        isActive: true,
        updatedAt: new Date(),
      },
    }).returning();

    console.log('✅ Supervisor PIN created (789012)');
    console.log(`✅ Supervisor: ${supervisorPin.name} (${supervisorPin.id})`);

    // Print policy signing public key
    const publicKey = getPolicyPublicKey();
    console.log('\n🔐 Policy Signing Public Key (for client verification):');
    console.log(publicKey);

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   Team: ${team.name} (${team.id})`);
    console.log(`   Device: ${device.name} (${device.id})`);
    console.log(`   User: ${user.displayName} (${user.id}, code: ${user.code})`);
    console.log(`   User PIN: 123456`);
    console.log(`   Supervisor PIN: 789012`);
    console.log(`   Policy Public Key: ${publicKey}`);

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
}

/**
 * Clean all data from the database (for testing)
 */
export async function cleanDatabase() {
  console.log('🧹 Cleaning database...');

  try {
    // Delete in order of dependencies
    await db.delete(userPins);
    await db.delete(supervisorPins);
    await db.delete(users);
    await db.delete(devices);
    await db.delete(teams);

    console.log('✅ Database cleaned successfully');
  } catch (error) {
    console.error('❌ Database cleaning failed:', error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (import.meta.main) {
  const command = process.argv[2];

  if (command === 'clean') {
    await cleanDatabase();
  } else if (command === 'seed') {
    await seedDatabase();
  } else {
    console.log('Usage: bun run src/lib/seed.ts [seed|clean]');
    console.log('  seed  - Populate database with sample data');
    console.log('  clean - Remove all data from database');
  }
}