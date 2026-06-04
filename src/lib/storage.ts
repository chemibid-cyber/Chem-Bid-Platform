import { createServiceClient } from '@/lib/supabase/service';

export const FILES_BUCKET = 'auction-files';
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_BYTES = 10 * 1024 * 1024;

export interface UploadResult {
  ok: boolean;
  path?: string;
  error?: string;
}

/** Upload to the private bucket. Returns the storage path (NOT a public URL). */
export async function uploadFile(prefix: string, file: File): Promise<UploadResult> {
  if (!file || file.size === 0) return { ok: false, error: 'No file provided.' };
  if (!ALLOWED.includes(file.type)) {
    return { ok: false, error: 'Only PDF, JPG or PNG files are allowed.' };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: 'File must be 10 MB or smaller.' };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  const path = `${prefix}/${Date.now()}-${safeName}`;
  const svc = createServiceClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await svc.storage.from(FILES_BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return { ok: false, error: 'Upload failed. Try again.' };
  return { ok: true, path };
}

/** Time-boxed signed URL for an access-controlled download (default 5 min). */
export async function signedUrl(path: string, expiresIn = 300): Promise<string | null> {
  if (!path) return null;
  const svc = createServiceClient();
  const { data } = await svc.storage.from(FILES_BUCKET).createSignedUrl(path, expiresIn);
  return data?.signedUrl ?? null;
}
