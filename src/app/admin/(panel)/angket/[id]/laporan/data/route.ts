import { NextResponse } from 'next/server';
import { getSettings, toBrand } from '@/lib/settings';
import { createClient } from '@/lib/supabase/server';
import { witaDate, type ReportData, type ReportRow } from '@/lib/report';
import { periodKey, type RepeatMode } from '@/lib/period';
import { ROLES, type Role } from '@/lib/types';

type Resp = {
  id: string;
  role: Role | null;
  class_name: string | null;
  submitted_at: string;
  period_key: string | null;
  source: string | null;
  respondents: { name: string; identifier: string } | null;
};
type Ans = { response_id: string; question_id: string; value_text: string | null; value_list: string[] | null };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Data laporan (JSON) untuk diunduh sebagai PDF/Excel. Saringan: ?from=YYYY-MM-DD&to=YYYY-MM-DD&peran=siswa */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: ok } = await supabase.rpc('is_admin');
  if (!ok) return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 403 });

  const sp = new URL(req.url).searchParams;
  const from = DATE_RE.test(sp.get('from') ?? '') ? sp.get('from') : null;
  const to = DATE_RE.test(sp.get('to') ?? '') ? sp.get('to') : null;
  const peran = ROLES.includes(sp.get('peran') as Role) ? (sp.get('peran') as Role) : null;

  const { data: form } = await supabase.from('forms').select('title, slug, targets, repeat_mode').eq('id', id).maybeSingle();
  if (!form) return NextResponse.json({ error: 'Angket tidak ditemukan' }, { status: 404 });
  const { data: qs } = await supabase.from('questions').select('id, type, title, options, settings').eq('form_id', id).order('position');

  // Semua tanggal pengisian (untuk pilihan tanggal), tanpa saringan.
  const allTimes: string[] = [];
  for (let f = 0; ; f += 1000) {
    const { data } = await supabase.from('responses').select('submitted_at').eq('form_id', id).order('submitted_at').range(f, f + 999);
    allTimes.push(...(data ?? []).map((r) => r.submitted_at as string));
    if (!data || data.length < 1000) break;
  }
  const dm = new Map<string, number>();
  for (const t of allTimes) dm.set(witaDate(t), (dm.get(witaDate(t)) ?? 0) + 1);
  const dates = [...dm.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([date, n]) => ({ date, n }));

  // Jawaban sesuai saringan (tanggal dalam WITA, UTC+8).
  const responses: Resp[] = [];
  for (let f = 0; ; f += 1000) {
    let q = supabase
      .from('responses')
      .select('id, role, class_name, submitted_at, period_key, source, respondents(name, identifier)')
      .eq('form_id', id);
    if (from) q = q.gte('submitted_at', `${from}T00:00:00+08:00`);
    if (to) q = q.lte('submitted_at', `${to}T23:59:59.999+08:00`);
    if (peran) q = q.eq('role', peran);
    const { data } = await q.order('submitted_at').range(f, f + 999);
    responses.push(...((data ?? []) as unknown as Resp[]));
    if (!data || data.length < 1000) break;
  }

  const answers = new Map<string, Record<string, string | string[]>>();
  const ids = responses.map((r) => r.id);
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    for (let f = 0; ; f += 1000) {
      const { data } = await supabase
        .from('answers')
        .select('response_id, question_id, value_text, value_list')
        .in('response_id', chunk)
        .range(f, f + 999);
      for (const a of (data ?? []) as Ans[]) {
        const rec = answers.get(a.response_id) ?? {};
        rec[a.question_id] = a.value_list ?? a.value_text ?? '';
        answers.set(a.response_id, rec);
      }
      if (!data || data.length < 1000) break;
    }
  }

  const rows: ReportRow[] = responses.map((r) => ({
    submitted_at: r.submitted_at,
    source: r.source,
    period_key: periodKey((form.repeat_mode ?? 'sekali') as RepeatMode, r.submitted_at),
    name: r.respondents?.name ?? null,
    identifier: r.respondents?.identifier ?? null,
    role: r.role,
    class_name: r.class_name,
    answers: answers.get(r.id) ?? {},
  }));

  // Urutan: Kepala Sekolah, Guru, Tenaga Kependidikan, Siswa, (lalu peran lain);
  // dalam satu peran: kelas, nama, lalu waktu kirim.
  const roleRank = (r: Role | null) => (r ? ROLES.indexOf(r) : ROLES.length);
  rows.sort(
    (a, b) =>
      roleRank(a.role) - roleRank(b.role) ||
      (a.class_name ?? '').localeCompare(b.class_name ?? '', 'id', { numeric: true }) ||
      (a.name ?? '').localeCompare(b.name ?? '', 'id') ||
      a.submitted_at.localeCompare(b.submitted_at),
  );

  const body: ReportData = {
    form: { title: form.title as string, slug: form.slug as string, targets: form.targets as Role[], repeat_mode: (form.repeat_mode ?? 'sekali') as RepeatMode },
    brand: toBrand(await getSettings()),
    questions: (qs ?? []).map((q) => ({ ...q, settings: q.settings ?? {} })) as ReportData['questions'],
    dates,
    rows,
  };
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}
