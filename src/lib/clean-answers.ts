import { filled, isOther, otherText, problem } from './answers';
import type { AnswerValue, Answers, Question } from './types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Rapikan & validasi satu jawaban. Mengembalikan nilai bersih, atau { error }. */
export function cleanAnswer(q: Question, v: AnswerValue | undefined): { value?: AnswerValue; error?: string } {
  if (v === undefined) return {};
  const err = problem(q, v);
  if (err) return { error: `${q.title.slice(0, 60)}: ${err}` };
  const allowOther = !!q.settings?.allow_other;
  const pickOne = (x: string): string | undefined => {
    if (isOther(x)) return allowOther ? otherText(x).trim().slice(0, 200) || undefined : undefined;
    return q.options.includes(x) ? x : undefined;
  };
  switch (q.type) {
    case 'radio':
    case 'dropdown':
      return { value: typeof v === 'string' ? pickOne(v) : undefined };
    case 'checkbox': {
      if (!Array.isArray(v)) return {};
      const chosen = q.options.filter((o) => v.includes(o));
      const other = v.find((x) => isOther(x));
      const typed = other ? pickOne(other) : undefined;
      return { value: typed ? [...chosen, typed] : chosen };
    }
    case 'short':
      return { value: typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, 300) : undefined };
    case 'long':
      return { value: typeof v === 'string' ? v.trim().slice(0, 4000) : undefined };
    case 'date':
      return { value: typeof v === 'string' && DATE_RE.test(v) ? v : undefined };
    case 'range':
      return { value: Array.isArray(v) && v.length === 2 && filled(q, v) ? v.map((x) => String(Number(x.trim()))) : undefined };
  }
}

/** Bersihkan semua jawaban untuk daftar pertanyaan. */
export function buildPayload(
  questions: Question[],
  answers: Answers | undefined,
  enforceRequired = true,
): { ok: true; payload: Answers } | { ok: false; error: string } {
  const payload: Answers = {};
  for (const q of questions) {
    const { value, error } = cleanAnswer(q, answers?.[q.id]);
    if (error) return { ok: false, error };
    const ok = value !== undefined && filled(q, value);
    if (enforceRequired && q.required && !ok) return { ok: false, error: `Pertanyaan "${q.title.slice(0, 60)}" wajib diisi.` };
    if (ok) payload[q.id] = value!;
  }
  return { ok: true, payload };
}
