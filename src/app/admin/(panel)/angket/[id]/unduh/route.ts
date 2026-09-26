import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ROLE_LABEL } from '@/lib/text';
import type { Role } from '@/lib/types';

type Resp = {
  id: string;
  role: Role | null;
  class_name: string | null;
  submitted_at: string;
  respondents: { name: string; identifier: string } | null;
};
type Ans = { response_id: string; question_id: string; value_text: string | null; value_list: string[] | null };

const csv = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Unduh semua jawaban sebagai CSV (bisa dibuka di Excel). Khusus admin. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: ok } = await supabase.rpc('is_admin');
  if (!ok) return new NextResponse('Tidak diizinkan', { status: 403 });

  const { data: form } = await supabase.from('forms').select('slug').eq('id', id).maybeSingle();
  if (!form) return new NextResponse('Angket tidak ditemukan', { status: 404 });
  const { data: qs } = await supabase.from('questions').select('id, title').eq('form_id', id).order('position');

  const responses: Resp[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase
      .from('responses')
      .select('id, role, class_name, submitted_at, respondents(name, identifier)')
      .eq('form_id', id)
      .order('submitted_at')
      .range(from, from + 999);
    responses.push(...((data ?? []) as unknown as Resp[]));
    if (!data || data.length < 1000) break;
  }

  const answers = new Map<string, Map<string, string>>();
  const ids = responses.map((r) => r.id);
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    for (let from = 0; ; from += 1000) {
      const { data } = await supabase
        .from('answers')
        .select('response_id, question_id, value_text, value_list')
        .in('response_id', chunk)
        .range(from, from + 999);
      for (const a of (data ?? []) as Ans[]) {
        if (!answers.has(a.response_id)) answers.set(a.response_id, new Map());
        answers.get(a.response_id)!.set(a.question_id, a.value_list ? a.value_list.join('; ') : a.value_text ?? '');
      }
      if (!data || data.length < 1000) break;
    }
  }

  const head = ['Waktu kirim', 'Nama', 'NISN/NIP', 'Peran', 'Kelas', ...(qs ?? []).map((q) => q.title as string)];
  const lines = [head.map(csv).join(',')];
  for (const r of responses) {
    const a = answers.get(r.id);
    lines.push(
      [
        new Date(r.submitted_at).toLocaleString('id-ID', { timeZone: 'Asia/Makassar' }),
        r.respondents?.name ?? '(anonim)',
        r.respondents?.identifier ?? '',
        r.role ? ROLE_LABEL[r.role] : '',
        r.class_name ?? '',
        ...(qs ?? []).map((q) => a?.get(q.id as string) ?? ''),
      ].map(csv).join(','),
    );
  }

  return new NextResponse('\uFEFF' + lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="jawaban-${form.slug}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
