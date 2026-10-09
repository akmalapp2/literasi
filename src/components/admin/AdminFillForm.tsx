'use client';

import { useMemo, useState, useTransition } from 'react';
import { adminFill } from '@/actions/answers';
import { endLabel, isOther, makeOther, otherLabel, otherText, startLabel } from '@/lib/answers';
import { periodKey, periodLabel, type RepeatMode } from '@/lib/period';
import { ROLE_LABEL, ROLE_SHORT, neutral } from '@/lib/text';
import type { AnswerValue, Answers, Question, Role } from '@/lib/types';

export type FillPerson = { id: string; name: string; identifier: string; role: Role; class_name: string | null };

type Props = { formId: string; repeatMode: RepeatMode; people: FillPerson[]; initialPerson: string; questions: Question[] };

/** Jumat terakhir sebelum hari ini (WITA), format YYYY-MM-DD. */
function lastFriday(): string {
  const now = new Date(Date.now() + 8 * 3600 * 1000); // geser ke WITA
  const dow = now.getUTCDay();
  const back = ((dow - 5 + 7) % 7) || 7;
  const d = new Date(now.getTime() - back * 86400000);
  return d.toISOString().slice(0, 10);
}
const todayWita = () => new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);

export default function AdminFillForm({ formId, repeatMode, people, initialPerson, questions }: Props) {
  const [personId, setPersonId] = useState(initialPerson);
  const [filter, setFilter] = useState('');
  const [date, setDate] = useState(repeatMode === 'sekali' ? todayWita() : lastFriday());
  const [time, setTime] = useState('10:00');
  const [answers, setAnswers] = useState<Answers>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const person = people.find((p) => p.id === personId) ?? null;
  const qs = useMemo(() => (person ? questions.filter((q) => q.roles.includes(person.role)) : []), [questions, person]);
  const shownPeople = filter
    ? people.filter((p) => `${p.name} ${p.identifier} ${p.class_name ?? ''}`.toLowerCase().includes(filter.toLowerCase()))
    : people;

  const set = (id: string, v: AnswerValue) => setAnswers((a) => ({ ...a, [id]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!person) return setError('Pilih responden terlebih dahulu.');
    start(async () => {
      const r = await adminFill({ formId, respondentId: person.id, date, time, answers });
      if (r && !r.ok) setError(r.error);
    });
  };

  const input = (q: Question) => {
    const v = answers[q.id];
    const other = !!q.settings?.allow_other;
    if (q.type === 'radio' || q.type === 'dropdown') {
      const cur = typeof v === 'string' ? v : '';
      const otherOn = isOther(cur);
      return (
        <>
          <select className="form-select" value={otherOn ? '__lainnya__' : cur} aria-label={q.title}
            onChange={(e) => set(q.id, e.target.value === '__lainnya__' ? makeOther('') : e.target.value)}>
            <option value="">— tidak diisi —</option>
            {q.options.map((o) => <option key={o} value={o}>{o}</option>)}
            {other && <option value="__lainnya__">{otherLabel(q.settings)}</option>}
          </select>
          {otherOn && (
            <input className="form-control mt-2" placeholder="Tuliskan jawaban lainnya" value={otherText(cur)} onChange={(e) => set(q.id, makeOther(e.target.value))} />
          )}
        </>
      );
    }
    if (q.type === 'checkbox') {
      const list = Array.isArray(v) ? v : [];
      const otherVal = list.find(isOther);
      const toggle = (o: string) => {
        const plain = list.filter((x) => !isOther(x));
        const next = plain.includes(o) ? plain.filter((x) => x !== o) : q.options.filter((x) => x === o || plain.includes(x));
        set(q.id, otherVal !== undefined ? [...next, otherVal] : next);
      };
      return (
        <>
          {q.options.map((o, k) => (
            <div className="form-check" key={o}>
              <input className="form-check-input" type="checkbox" id={`${q.id}-${k}`} checked={list.includes(o)} onChange={() => toggle(o)} />
              <label className="form-check-label" htmlFor={`${q.id}-${k}`}>{o}</label>
            </div>
          ))}
          {other && (
            <div className="d-flex gap-2 align-items-center mt-1">
              <input className="form-check-input mt-0" type="checkbox" id={`${q.id}-other`} checked={otherVal !== undefined}
                onChange={(e) => set(q.id, e.target.checked ? [...list, makeOther('')] : list.filter((x) => !isOther(x)))} />
              <input className="form-control form-control-sm" placeholder={otherLabel(q.settings)} value={otherVal ? otherText(otherVal) : ''}
                aria-label={otherLabel(q.settings)}
                onChange={(e) => set(q.id, [...list.filter((x) => !isOther(x)), makeOther(e.target.value)])} />
            </div>
          )}
        </>
      );
    }
    if (q.type === 'long') {
      return <textarea className="form-control" rows={3} maxLength={4000} value={typeof v === 'string' ? v : ''} onChange={(e) => set(q.id, e.target.value)} aria-label={q.title} />;
    }
    if (q.type === 'date') {
      return <input type="date" className="form-control" style={{ maxWidth: 220 }} value={typeof v === 'string' ? v : ''} onChange={(e) => set(q.id, e.target.value)} aria-label={q.title} />;
    }
    if (q.type === 'range') {
      const r = Array.isArray(v) && v.length === 2 ? v : ['', ''];
      return (
        <div className="d-flex flex-wrap align-items-center gap-2">
          <span>{startLabel(q.settings)}</span>
          <input type="number" className="form-control" style={{ width: 110 }} value={r[0]} onChange={(e) => set(q.id, [e.target.value, r[1]])} aria-label={startLabel(q.settings)} />
          <span>{endLabel(q.settings)}</span>
          <input type="number" className="form-control" style={{ width: 110 }} value={r[1]} onChange={(e) => set(q.id, [r[0], e.target.value])} aria-label={endLabel(q.settings)} />
        </div>
      );
    }
    return <input className="form-control" maxLength={300} value={typeof v === 'string' ? v : ''} onChange={(e) => set(q.id, e.target.value)} aria-label={q.title} />;
  };

  return (
    <form onSubmit={submit} className="d-flex flex-column gap-3">
      <div className="card border-0 shadow-sm"><div className="card-body p-3 p-md-4">
        <h2 className="h6 fw-bold mb-3">1. Responden</h2>
        {person ? (
          <div className="d-flex flex-wrap align-items-center gap-2">
            <div className="flex-grow-1">
              <div className="fw-semibold">{person.name}</div>
              <div className="small text-secondary">{ROLE_LABEL[person.role]}{person.class_name ? `, ${person.class_name}` : ''} · {person.identifier}</div>
            </div>
            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { setPersonId(''); setAnswers({}); }}>Ganti</button>
          </div>
        ) : (
          <>
            <input className="form-control mb-2" placeholder="Cari nama / NIT / NIP / kelas" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Cari responden" />
            <select className="form-select" size={8} value={personId} onChange={(e) => { setPersonId(e.target.value); setAnswers({}); }} aria-label="Pilih responden">
              {shownPeople.slice(0, 300).map((p) => (
                <option key={p.id} value={p.id}>{ROLE_SHORT[p.role]} · {p.class_name ? `${p.class_name} · ` : ''}{p.name} ({p.identifier})</option>
              ))}
            </select>
            {shownPeople.length > 300 && <div className="form-text">Menampilkan 300 pertama. Ketik nama untuk mempersempit.</div>}
          </>
        )}
      </div></div>

      <div className="card border-0 shadow-sm"><div className="card-body p-3 p-md-4">
        <h2 className="h6 fw-bold mb-3">2. Tanggal pengisian</h2>
        <div className="d-flex flex-wrap gap-2 align-items-end">
          <div>
            <label className="form-label small fw-semibold" htmlFor="tgl">Tanggal</label>
            <input id="tgl" type="date" className="form-control" value={date} max={todayWita()} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label className="form-label small fw-semibold" htmlFor="jam">Jam (WITA)</label>
            <input id="jam" type="time" className="form-control" value={time} onChange={(e) => setTime(e.target.value)} required />
          </div>
        </div>
        {repeatMode !== 'sekali' && /^\d{4}-\d{2}-\d{2}$/.test(date) && (
          <div className="small text-secondary mt-2">
            <i className="bi bi-calendar-week me-1" />Masuk ke periode <strong>{periodLabel(periodKey(repeatMode, new Date(`${date}T12:00:00+08:00`)))}</strong>.
          </div>
        )}
      </div></div>

      {person && (
        <div className="card border-0 shadow-sm"><div className="card-body p-3 p-md-4">
          <h2 className="h6 fw-bold mb-1">3. Jawaban</h2>
          <p className="small text-secondary mb-3">Soal yang dikosongkan tidak disimpan. Soal wajib boleh dikosongkan untuk isi susulan.</p>
          <div className="d-flex flex-column gap-3">
            {qs.map((q, i) => (
              <div key={q.id}>
                <div className="fw-semibold mb-1">{i + 1}. {neutral(q.title)}{q.required && <span className="req ms-1">*</span>}</div>
                {input(q)}
              </div>
            ))}
          </div>
        </div></div>
      )}

      {error && <div className="alert alert-danger py-2 mb-0" role="alert">{error}</div>}
      <div className="d-flex gap-2">
        <button className="btn btn-primary px-4" disabled={pending || !person}>
          {pending && <span className="spinner-border spinner-border-sm me-2" />}Simpan isi susulan
        </button>
      </div>
      <p className="small text-secondary mb-0">
        Jawaban ditandai <strong>&quot;Susulan oleh admin&quot;</strong>. Satu orang tetap hanya bisa punya satu jawaban per {repeatMode === 'harian' ? 'hari' : repeatMode === 'mingguan' ? 'minggu' : 'angket'}.
      </p>
    </form>
  );
}
