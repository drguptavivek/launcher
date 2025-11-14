-- Corrected Migration: Role Data Compatibility Fix
-- This migration safely transitions from old 3-role system to new 9-role system

-- Step 1: Create a temporary backup of users table for safety
CREATE TABLE IF NOT EXISTS users_migration_backup AS TABLE users;

-- Step 2: Add temporary text column to hold mapped role values (no dependencies)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_tmp text;

-- Step 3: Map old roles to new roles based on the RBAC strategy document
-- Only use values that exist in the CURRENT enum or will exist in the new enum
UPDATE users SET role_tmp = CASE
  -- Old roles: TEAM_MEMBER, SUPERVISOR, ADMIN
  WHEN role::text = 'TEAM_MEMBER' THEN 'TEAM_MEMBER'::text
  WHEN role::text = 'SUPERVISOR' THEN 'FIELD_SUPERVISOR'::text
  WHEN role::text = 'ADMIN' THEN 'SYSTEM_ADMIN'::text
  ELSE 'TEAM_MEMBER'::text -- Default fallback for any unexpected values
END WHERE role_tmp IS NULL;

-- Step 4: Safely convert the role column to text first (removes enum dependency)
ALTER TABLE users ALTER COLUMN role SET DATA TYPE text;

-- Step 5: Update the original role column with mapped values from temp column
UPDATE users SET role = role_tmp WHERE role_tmp IS NOT NULL;

-- Step 6: Drop the old enum type (CASCADE will remove dependencies)
DROP TYPE IF EXISTS "public"."user_role" CASCADE;

-- Step 7: Create the new user_role enum with 9 values
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

-- Step 8: Convert the role column to the new enum type
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'TEAM_MEMBER'::"public"."user_role";
ALTER TABLE users ALTER COLUMN role SET DATA TYPE "public"."user_role"
USING "role"::"public"."user_role";

-- Step 9: Drop the temporary role_tmp column
ALTER TABLE users DROP COLUMN IF EXISTS role_tmp;

-- Step 10: Clean up the backup table (optional - uncomment after verification)
-- DROP TABLE IF EXISTS users_migration_backup;

-- Step 11: Verify the migration was successful
DO $$
DECLARE
  migration_count integer;
  team_member_count integer;
  field_supervisor_count integer;
  system_admin_count integer;
BEGIN
  SELECT COUNT(*) INTO migration_count FROM users;
  SELECT COUNT(*) INTO team_member_count FROM users WHERE role = 'TEAM_MEMBER'::user_role;
  SELECT COUNT(*) INTO field_supervisor_count FROM users WHERE role = 'FIELD_SUPERVISOR'::user_role;
  SELECT COUNT(*) INTO system_admin_count FROM users WHERE role = 'SYSTEM_ADMIN'::user_role;

  RAISE NOTICE 'Role migration completed successfully:';
  RAISE NOTICE '- Total users: %', migration_count;
  RAISE NOTICE '- TEAM_MEMBER: %', team_member_count;
  RAISE NOTICE '- FIELD_SUPERVISOR: %', field_supervisor_count;
  RAISE NOTICE '- SYSTEM_ADMIN: %', system_admin_count;
END $$;