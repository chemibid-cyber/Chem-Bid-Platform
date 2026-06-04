import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { casCache, type CasCacheRow } from '@/lib/db/schema';
import { dedupeCids, classifyCas, type CasCandidate, type CasResolution } from './parse';

const BASE = process.env.PUBCHEM_BASE_URL ?? 'https://pubchem.ncbi.nlm.nih.gov/rest/pug';
const TIMEOUT_MS = 7000;
const MAX_CANDIDATES = 8;

async function fetchJson(url: string): Promise<unknown | null> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!res.ok) return null; // 404 = no match for this synonym
    return (await res.json()) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function fetchCids(cas: string): Promise<string[]> {
  const url = `${BASE}/compound/name/${encodeURIComponent(cas)}/cids/JSON`;
  const json = (await fetchJson(url)) as { IdentifierList?: { CID?: number[] } } | null;
  return dedupeCids(json?.IdentifierList?.CID ?? []);
}

async function fetchTitles(cids: string[]): Promise<CasCandidate[]> {
  const slice = cids.slice(0, MAX_CANDIDATES);
  const url = `${BASE}/compound/cid/${slice.join(',')}/property/Title/JSON`;
  const json = (await fetchJson(url)) as
    | { PropertyTable?: { Properties?: Array<{ CID: number; Title?: string }> } }
    | null;
  const props = json?.PropertyTable?.Properties ?? [];
  return props.map((p) => ({ cid: String(p.CID), name: p.Title ?? `CID ${p.CID}` }));
}

function fromCache(row: CasCacheRow): CasResolution {
  if (row.status === 'not_found') return { status: 'not_found' };
  const candidates = (row.candidates as CasCandidate[] | null) ?? [];
  if (row.status === 'ambiguous') return { status: 'ambiguous', candidates };
  return {
    status: 'found',
    name: row.resolvedName ?? candidates[0]?.name ?? '',
    cid: row.cid ?? candidates[0]?.cid ?? '',
    candidates,
  };
}

async function writeCache(cas: string, resolution: CasResolution): Promise<void> {
  const base = {
    casNumber: cas,
    status: resolution.status,
    resolvedName: resolution.status === 'found' ? resolution.name : null,
    cid: resolution.status === 'found' ? resolution.cid : null,
    candidates:
      resolution.status === 'not_found' ? null : (resolution.candidates as unknown as object),
  };
  await db
    .insert(casCache)
    .values(base)
    .onConflictDoUpdate({ target: casCache.casNumber, set: base });
}

/**
 * Resolve a CAS to a compound name. Cache-first (cuts PubChem calls ~90%); on
 * miss, query PubChem, dedup CIDs, classify 0/1/many, and cache the result.
 * Never throws — a flaky API degrades to `not_found` (manual entry).
 */
export async function resolveCas(casRaw: string): Promise<CasResolution> {
  const cas = casRaw.trim();
  if (!cas) return { status: 'not_found' };

  const [cached] = await db.select().from(casCache).where(eq(casCache.casNumber, cas)).limit(1);
  if (cached) return fromCache(cached);

  const cids = await fetchCids(cas);
  if (cids.length === 0) {
    await writeCache(cas, { status: 'not_found' });
    return { status: 'not_found' };
  }

  const candidates = await fetchTitles(cids);
  const resolution = classifyCas(candidates);
  await writeCache(cas, resolution);
  return resolution;
}
