import { db } from './src/lib/db/index';

async function createWebAdminTable() {
  try {
    console.log('Creating web_admin_users table...');

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS "web_admin_users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "email" varchar(255) NOT NULL,
        "password" varchar(255) NOT NULL,
        "first_name" varchar(255) NOT NULL,
        "last_name" varchar(255) NOT NULL,
        "role" "user_role" DEFAULT 'SYSTEM_ADMIN' NOT NULL,
        "is_active" boolean DEFAULT true NOT NULL,
        "last_login_at" timestamp with time zone,
        "login_attempts" integer DEFAULT 0 NOT NULL,
        "locked_at" timestamp with time zone,
        "password_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "web_admin_users_email_unique" UNIQUE("email")
      );
    `;

    await db.execute(createTableSQL);
    console.log('web_admin_users table created successfully!');

    // Create indexes
    console.log('Creating indexes...');

    await db.execute(`
      CREATE INDEX IF NOT EXISTS "web_admin_users_email_idx"
      ON "web_admin_users"("email");
    `);

    await db.execute(`
      CREATE INDEX IF NOT EXISTS "web_admin_users_role_idx"
      ON "web_admin_users"("role");
    `);

    console.log('Indexes created successfully!');

    process.exit(0);
  } catch (error) {
    console.error('Error creating table:', error);
    process.exit(1);
  }
}

createWebAdminTable();