require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().optional(),

  // Auth
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),

  // Database
  DATABASE_PATH: z.string().default('./data/premiumgiftbox.db'),

  // SMTP (all optional — email features disabled when missing)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  // WhatsApp (all optional — WhatsApp features disabled when missing)
  WHATSAPP_API_URL: z.string().default('https://graph.facebook.com/v18.0'),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().optional(),
  WHATSAPP_APP_SECRET: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),

  // Backup
  AUTO_BACKUP: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),
  BACKUP_FREQUENCY: z.coerce.number().default(4),
  BACKUP_DIR: z.string().default('./backups'),

  // Feature flags
  ENABLE_WHATSAPP: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),
  ENABLE_EMAIL: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),
  ENABLE_NOTIFICATIONS: z
    .string()
    .transform((v) => v !== 'false')
    .default('true'),
  ENABLE_ANALYTICS: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),
  ENABLE_BACKUP: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),

  // Sentry (optional — error tracking disabled when missing)
  SENTRY_DSN: z.string().optional(),

  // File uploads
  MAX_FILE_SIZE: z.coerce.number().default(10485760),
  UPLOAD_DIR: z.string().default('./uploads'),
});

let env;
try {
  env = envSchema.parse(process.env);
} catch (err) {
  console.error('Environment validation failed:');
  if (err.issues) {
    for (const issue of err.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`);
    }
  } else {
    console.error(err.message);
  }
  process.exit(1);
}

module.exports = env;
