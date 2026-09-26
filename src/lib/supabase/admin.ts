import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Klien dengan SECRET KEY — melewati RLS. Hanya dipakai di server untuk
 * halaman responden & hasil publik. Jangan pernah diimpor dari komponen klien.
 */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
