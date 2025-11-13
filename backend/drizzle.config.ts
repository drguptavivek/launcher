import type { Config } from 'drizzle-kit';
import { env } from './src/lib/config';

export default {
  dialect: 'postgresql',
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
} satisfies Config;