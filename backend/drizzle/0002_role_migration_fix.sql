-- Migration: Role Data Compatibility Fix
-- This migration handles the transition from old 3-role system to new 9-role system
-- It maps existing user roles to the new enum values before recreating the enum type

-- Step 1: Create a temporary backup of users table for safety
CREATE TABLE IF NOT EXISTS users_backup AS TABLE users;

-- Step 2: Add temporary text column to hold mapped role values
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_new text;

-- Step 3: Map old roles to new roles based on the RBAC strategy document
UPDATE users SET role_new = CASE
  -- Old roles: TEAM_MEMBER, SUPERVISOR, ADMIN
  WHEN role = 'TEAM_MEMBER' THEN 'TEAM_MEMBER'::text
  WHEN role = 'SUPERVISOR' THEN 'FIELD_SUPERVISOR'::text -- Map old SUPERVISOR to new FIELD_SUPERVISOR
  WHEN role = 'ADMIN' THEN 'SYSTEM_ADMIN'::text -- Map old ADMIN to new SYSTEM_ADMIN
  WHEN role IN ('TEAM_MEMBER', 'FIELD_SUPERVISOR', 'REGIONAL_MANAGER', 'SYSTEM_ADMIN', 'SUPPORT_AGENT', 'AUDITOR', 'DEVICE_MANAGER', 'POLICY_ADMIN', 'NATIONAL_SUPPORT_ADMIN')
    THEN role::text -- Keep values that are already in new enum
  ELSE 'TEAM_MEMBER'::text -- Default fallback
END WHERE role_new IS NULL;

-- Step 4: Drop the old user_role enum type (will fail if not exists, but that's okay)
DROP TYPE IF EXISTS "public"."user_role";

-- Step 5: Create the new user_role enum with 9 values
CREATE TYPE "public"."user_role" AS ENUM(
  'TEAM_MEMBER',
  'FIELD_SUPERVISOR',
  'REGIONAL_MANAGER',
  'SYSTEM_ADMIN',
  'SUPPORT_AGENT',
  'AUDITOR',
  'DEVICE_MANAGER',
  'POLICY_ADMIN',
  'NATIONAL_SUPPORT_ADMIN'
);

-- Step 6: Safely convert the role column using the mapped values
-- First make it text, then convert to enum with proper values
ALTER TABLE users ALTER COLUMN role SET DATA TYPE text;
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'TEAM_MEMBER'::text;

-- Update the original role column with mapped values
UPDATE users SET role = role_new WHERE role_new IS NOT NULL;

-- Step 7: Convert the role column to the new enum type
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'TEAM_MEMBER'::"public"."user_role";
ALTER TABLE users ALTER COLUMN role SET DATA TYPE "public"."user_role"
USING "role"::"public"."user_role";

-- Step 8: Drop the temporary role_new column
ALTER TABLE users DROP COLUMN IF EXISTS role_new;

-- Step 9: Verify the migration was successful (for logging purposes)
DO $$
DECLARE
  migration_count integer;
BEGIN
  SELECT COUNT(*) INTO migration_count FROM users;
  RAISE NOTICE 'Role migration completed: % users processed', migration_count;
END $$;

-- Optional: Keep the backup table temporarily for safety
-- DROP TABLE users_backup; -- Uncomment after verifying migration success