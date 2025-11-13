#!/usr/bin/env tsx

/**
 * Cryptographic Key Generation Script
 *
 * Usage:
 * npm run keys:generate     # Generate all keys
 * npm run keys:jwt         # Generate JWT secrets only
 * npm run keys:policy      # Generate Ed25519 policy key only
 */

import nacl from 'tweetnacl';
import { randomBytes } from 'crypto';

console.log('🔐 SurveyLauncher Key Generation\n');

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

function main() {
  const command = process.argv[2];

  switch (command) {
    case 'jwt':
      console.log('🔑 JWT Secrets Generated:');
      console.log('JWT_ACCESS_SECRET:', generateJWTSecret());
      console.log('JWT_REFRESH_SECRET:', generateJWTSecret());
      break;

    case 'policy':
      const policyKey = generatePolicyKey();
      console.log('🔑 Ed25519 Policy Key Generated:');
      console.log('POLICY_SIGN_PRIVATE_BASE64:', policyKey.privateKey);
      console.log('POLICY_SIGN_PUBLIC_BASE64:', policyKey.privateKey);
      break;

    default:
      console.log('🔑 Complete Key Set Generated:');
      console.log('\n--- JWT Secrets ---');
      console.log('JWT_ACCESS_SECRET:', generateJWTSecret());
      console.log('JWT_REFRESH_SECRET:', generateJWTSecret());

      const keySet = generatePolicyKey();
      console.log('\n--- Ed25519 Policy Key ---');
      console.log('POLICY_SIGN_PRIVATE_BASE64:', keySet.privateKey);
      console.log('POLICY_SIGN_PUBLIC_BASE64:', keySet.publicKey);

      console.log('\n📝 Add these to your .env file');
      break;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}