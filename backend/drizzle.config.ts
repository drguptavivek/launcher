import type { Config } from 'drizzle-kit';
import { env } from './src/lib/config';

export default {
  dialect: 'sqlite',
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: env.DATABASE_URL.replace('sqlite:', ''),
  },
  strict: true,
  verbose: true,
} satisfies Config;