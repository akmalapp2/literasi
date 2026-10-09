import 'server-only';

/**
 * Ambil SEMUA baris dari query Supabase, 1.000 per halaman.
 * (Supabase membatasi satu permintaan maksimal 1.000 baris.)
 * Contoh: fetchAll((a, b) => db.from('respondents').select('id').range(a, b))
 */
export async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error?: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < 200_000; from += 1000) {
    const { data } = await page(from, from + 999);
    if (!data?.length) break;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}
