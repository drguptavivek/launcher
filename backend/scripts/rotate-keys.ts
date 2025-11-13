#!/usr/bin/env tsx

/**
 * Key Rotation Helper Script
 *
 * This script helps with key rotation by:
 * 1. Generating new keys
 * 2. Creating backup of current keys
 * 3. Updating environment files
 * 4. Generating rotation documentation
 *
 * Usage:
 * npm run keys:rotate       # Interactive rotation
 * npm run keys:rotate jwt   # Rotate JWT keys only
 * npm run keys:rotate policy # Rotate policy key only
 */

import fs from 'fs';
import path from 'path';
import nacl from 'tweetnacl';
import { randomBytes } from 'crypto';

interface RotationConfig {
  jwt: boolean;
  policy: boolean;
  dryRun: boolean;
  backupDir: string;
}

console.log('🔄 SurveyLauncher Key Rotation\n');

function generateJWTSecret(): string {
  return randomBytes(32).toString('base64');
}

function generatePolicyKey() {
  const keyPair = nacl.sign.keyPair();
  return {
    privateKey: Buffer.from(keyPair.secretKey).toString('base64'),
    publicKey: Buffer.from(keyPair.publicKey).toString('base64'),
  };
}

function backupCurrentKeys(backupDir: string): void {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `.env.backup.${timestamp}`);
    fs.copyFileSync(envPath, backupPath);
    console.log(`✅ Backed up .env to: ${backupPath}`);
  }
}

function parseRotationArgs(): RotationConfig {
  const args = process.argv.slice(2);

  return {
    jwt: args.includes('jwt') || !args.includes('policy'),
    policy: args.includes('policy') || !args.includes('jwt'),
    dryRun: args.includes('--dry-run'),
    backupDir: path.join(process.cwd(), '.key-backups'),
  };
}

function generateNewKeys(config: RotationConfig) {
  const newKeys: Record<string, string> = {};

  if (config.jwt) {
    newKeys['JWT_ACCESS_SECRET'] = generateJWTSecret();
    newKeys['JWT_REFRESH_SECRET'] = generateJWTSecret();
    console.log('🔑 Generated new JWT secrets');
  }

  if (config.policy) {
    const policyKey = generatePolicyKey();
    newKeys['POLICY_SIGN_PRIVATE_BASE64'] = policyKey.privateKey;
    newKeys['POLICY_SIGN_PUBLIC_BASE64'] = policyKey.publicKey;
    console.log('🔑 Generated new Ed25519 policy key');
  }

  return newKeys;
}

function readCurrentEnv(): Record<string, string> {
  const envPath = path.join(process.cwd(), '.env');
  const env: Record<string, string> = {};

  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    });
  }

  return env;
}

function updateEnvForRotation(env: Record<string, string>, newKeys: Record<string, string>, config: RotationConfig) {
  const updatedEnv = { ...env };

  // Rename current keys to _OLD
  if (config.jwt) {
    if (updatedEnv['JWT_ACCESS_SECRET']) {
      updatedEnv['JWT_ACCESS_SECRET_OLD'] = updatedEnv['JWT_ACCESS_SECRET'];
    }
    if (updatedEnv['JWT_REFRESH_SECRET']) {
      updatedEnv['JWT_REFRESH_SECRET_OLD'] = updatedEnv['JWT_REFRESH_SECRET'];
    }
  }

  if (config.policy) {
    if (updatedEnv['POLICY_SIGN_PRIVATE_BASE64']) {
      updatedEnv['POLICY_SIGN_PRIVATE_BASE64_OLD'] = updatedEnv['POLICY_SIGN_PRIVATE_BASE64'];
    }
    if (updatedEnv['POLICY_SIGN_PUBLIC_BASE64']) {
      updatedEnv['POLICY_SIGN_PUBLIC_BASE64_OLD'] = updatedEnv['POLICY_SIGN_PUBLIC_BASE64'];
    }
  }

  // Add new keys
  Object.assign(updatedEnv, newKeys);

  return updatedEnv;
}

function writeEnvFile(env: Record<string, string>, dryRun: boolean): void {
  const content = Object.entries(env)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  if (dryRun) {
    console.log('\n📄 Dry Run - New .env content:');
    console.log('─'.repeat(50));
    console.log(content);
    console.log('─'.repeat(50));
  } else {
    const envPath = path.join(process.cwd(), '.env');
    fs.writeFileSync(envPath, content);
    console.log(`✅ Updated .env file`);
  }
}

function generateRotationReport(newKeys: Record<string, string>, config: RotationConfig): void {
  const timestamp = new Date().toISOString();
  const report = [
    '# Key Rotation Report',
    '',
    `Generated: ${timestamp}`,
    '',
    '## Keys Rotated',
    '',
  ];

  if (config.jwt) {
    report.push('### JWT Keys');
    report.push('- ✅ Access secret rotated');
    report.push('- ✅ Refresh secret rotated');
    report.push('');
  }

  if (config.policy) {
    report.push('### Ed25519 Policy Key');
    report.push('- ✅ Private key rotated');
    report.push('- ✅ Public key rotated');
    report.push('');
  }

  report.push('## New Keys');
  report.push('');
  Object.entries(newKeys).forEach(([key, value]) => {
    const maskedValue = value.substring(0, 8) + '...' + value.substring(value.length - 8);
    report.push(`${key}: ${maskedValue}`);
  });

  report.push('');
  report.push('## Next Steps');
  report.push('1. Deploy the updated .env file');
  report.push('2. Monitor application for 24-48 hours');
  report.push('3. Remove old keys after validation:');
  report.push('   - JWT_ACCESS_SECRET_OLD');
  report.push('   - JWT_REFRESH_SECRET_OLD');
  report.push('   - POLICY_SIGN_PRIVATE_BASE64_OLD');
  report.push('   - POLICY_SIGN_PUBLIC_BASE64_OLD');

  try {
    const reportPath = path.join(process.cwd(), '.key-backups', `rotation-report-${Date.now()}.md`);
    fs.writeFileSync(reportPath, report.join('\n'));
    console.log(`📝 Generated rotation report: ${reportPath}`);
  } catch (error) {
    console.log('📝 Rotation Report:');
    console.log(report.join('\n'));
  }
}

function main() {
  const config = parseRotationArgs();

  console.log('🔍 Configuration:');
  console.log(`  JWT Rotation: ${config.jwt ? '✅' : '❌'}`);
  console.log(`  Policy Rotation: ${config.policy ? '✅' : '❌'}`);
  console.log(`  Dry Run: ${config.dryRun ? '✅' : '❌'}`);
  console.log(`  Backup Directory: ${config.backupDir}`);
  console.log('');

  try {
    // Step 1: Backup current keys
    if (!config.dryRun) {
      backupCurrentKeys(config.backupDir);
    }

    // Step 2: Generate new keys
    const newKeys = generateNewKeys(config);
    console.log('');

    // Step 3: Read current environment
    const currentEnv = readCurrentEnv();
    const updatedEnv = updateEnvForRotation(currentEnv, newKeys, config);

    // Step 4: Update environment file
    writeEnvFile(updatedEnv, config.dryRun);
    console.log('');

    // Step 5: Generate rotation report
    generateRotationReport(newKeys, config);

    console.log('\n🎉 Key rotation completed successfully!');
    console.log('\n⚠️  Important:');
    console.log('1. Deploy the updated .env file');
    console.log('2. Monitor for errors for 24-48 hours');
    console.log('3. Remove old keys after successful validation');

  } catch (error) {
    console.error('❌ Key rotation failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}