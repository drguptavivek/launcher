import { z } from 'zod';
import { config } from 'dotenv';

// Load environment variables
config();

const envSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number()).default(3000),
  HOST: z.string().default('localhost'),

  // Database Configuration
  DATABASE_URL: z.string().min(1),

  // JWT Configuration
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  // Policy Signing Key
  POLICY_SIGN_PRIVATE_BASE64: z.string().min(1),

  // Argon2 Configuration
  ARGON2_MEMORY_SIZE: z.string().transform(Number).pipe(z.number()).default(65536),
  ARGON2_ITERATIONS: z.string().transform(Number).pipe(z.number()).default(3),
  ARGON2_PARALLELISM: z.string().transform(Number).pipe(z.number()).default(1),
  ARGON2_SALT_LENGTH: z.string().transform(Number).pipe(z.number()).default(16),
  ARGON2_HASH_LENGTH: z.string().transform(Number).pipe(z.number()).default(32),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number()).default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number()).default(100),
  LOGIN_RATE_LIMIT_MAX: z.string().transform(Number).pipe(z.number()).default(5),
  PIN_RATE_LIMIT_MAX: z.string().transform(Number).pipe(z.number()).default(10),

  // CORS Configuration
  CORS_ALLOWED_ORIGINS: z.string().transform(val => val.split(',').map(s => s.trim())),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),

  // Security
  MAX_CLOCK_SKEW_SEC: z.string().transform(Number).pipe(z.number()).default(180),
  MAX_POLICY_AGE_SEC: z.string().transform(Number).pipe(z.number()).default(86400),
  SESSION_TIMEOUT_HOURS: z.string().transform(Number).pipe(z.number()).default(8),

  // Security Hardening (Phase 4.4)
  REQUEST_TIMEOUT_MS: z.string().transform(Number).pipe(z.number()).default(30000),
  BLOCKED_IPS: z.string().optional(),
  BLOCKED_USER_AGENTS: z.string().optional(),

  // Telemetry
  TELEMETRY_BATCH_MAX: z.string().transform(Number).pipe(z.number()).default(50),
  HEARTBEAT_MINUTES: z.string().transform(Number).pipe(z.number()).default(10),
  GPS_FIX_INTERVAL_MINUTES: z.string().transform(Number).pipe(z.number()).default(3),
  GPS_ACCURACY_THRESHOLD_M: z.string().transform(Number).pipe(z.number()).default(20),
  GPS_MAX_AGE_MINUTES: z.string().transform(Number).pipe(z.number()).default(5),
  TELEMETRY_RETRY_ATTEMPTS: z.string().transform(Number).pipe(z.number()).default(3),
  TELEMETRY_UPLOAD_INTERVAL_MINUTES: z.string().transform(Number).pipe(z.number()).default(15),
  POLICY_UI_BLOCKED_MESSAGE: z.string().default('Access outside working hours. Please contact your supervisor.'),
});

function parseConfig() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues
        .filter(err => err.code === 'invalid_type')
        .map((err: any) => `- ${err.path.join('.')}: ${err.message}`);

      if (missingVars.length > 0) {
        console.error('❌ Missing or invalid environment variables:');
        console.error(missingVars.join('\n'));
        console.error('\nPlease check your .env file or environment configuration.');
        process.exit(1);
      }
    }
    throw error;
  }
}

export const env = parseConfig();

export type Env = z.infer<typeof envSchema>;
