/**
 * Live GST-provider check through the app's own factory + adapter.
 *   npx tsx scripts/test-gst.ts <GSTIN>
 * Uses GST_PROVIDER + the provider's key from .env.local. Each run costs one
 * vendor credit for real providers.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

async function main() {
  const gstin = process.argv[2];
  if (!gstin) {
    console.error('usage: npx tsx scripts/test-gst.ts <GSTIN>');
    process.exit(1);
  }
  const { getGstProvider } = await import('../src/lib/gst');
  const provider = getGstProvider();
  console.log(`provider: ${provider.name}`);
  try {
    const r = await provider.verify(gstin);
    console.log(JSON.stringify({ ...r, raw: undefined }, null, 2));
  } catch (e) {
    console.error('THREW (→ signup would fall back to provisional/pending):');
    console.error(e instanceof Error ? e.message : e);
    process.exit(2);
  }
}

main();
