import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

// Drizzle needs a direct Postgres connection string. On Supabase use the
// "Connection string" (session/pooler) from Project Settings → Database.
export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  verbose: true,
  strict: true,
});
