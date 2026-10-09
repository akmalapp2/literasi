import 'server-only';
import { fetchAll } from './fetch-all';
import { periodKey, rangeOfKey, type RepeatMode } from './period';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = { from: (table: string) => any };

/**
 * SATU-SATUNYA sumber "sudah mengisi": data jawaban (tabel responses).
 * Mode sekali → pernah mengisi; mode mingguan/harian → mengisi pada periode sekarang.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function scoped(q: any, mode: RepeatMode | null | undefined) {
  const rg = mode && mode !== 'sekali' ? rangeOfKey(periodKey(mode)) : null;
  return rg ? q.gte('submitted_at', rg.start).lt('submitted_at', rg.end) : q;
}

/** id responden yang sudah mengisi pada periode sekarang. */
export async function filledIds(db: Db, formId: string, mode: RepeatMode | null | undefined): Promise<Set<string>> {
  const rows = await fetchAll<{ respondent_id: string }>((a, b) =>
    scoped(db.from('responses').select('respondent_id').eq('form_id', formId).not('respondent_id', 'is', null), mode)
      .order('id')
      .range(a, b),
  );
  return new Set(rows.map((r) => r.respondent_id));
}

/** Apakah satu responden sudah mengisi pada periode sekarang. */
export async function hasFilled(db: Db, formId: string, respondentId: string, mode: RepeatMode | null | undefined): Promise<boolean> {
  const { count } = await scoped(
    db.from('responses').select('id', { count: 'exact', head: true }).eq('form_id', formId).eq('respondent_id', respondentId),
    mode,
  );
  return (count ?? 0) > 0;
}
