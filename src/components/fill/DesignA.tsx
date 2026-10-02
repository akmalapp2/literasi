'use client';

import { useEffect, useRef, useState } from 'react';
import { BrandMark } from '@/components/Brand';
import { endLabel, filled, fmtAnswer, isOther, makeOther, otherLabel, otherText, problem, startLabel } from '@/lib/answers';
import { KEYS, greetingName, personalize } from '@/lib/text';
import type { AnswerValue, Question } from '@/lib/types';
import type { DesignProps } from './types';
import Credit from '@/components/Credit';

const OTHER_SELECT = '__lainnya__';

/** Desain A — satu pertanyaan per layar. */
export default function DesignA(p: DesignProps) {
  const { questions: qs, answers, setAnswer, role } = p;
  const n = qs.length;
  const [step, setStep] = useState(-1); // -1 pembuka, 0..n-1 pertanyaan, n periksa
  const t = (s: string) => personalize(s, role);
  const field = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const otherField = useRef<HTMLInputElement | null>(null);

  const q: Question | undefined = step >= 0 && step < n ? qs[step] : undefined;
  const cur: AnswerValue | undefined = q ? answers[q.id] : undefined;
  const prob = q ? problem(q, cur) : null;
  const canNext = !q || ((!q.required || filled(q, cur)) && !prob);

  const pick = (qq: Question, o: string) => {
    if (qq.type === 'radio') setAnswer(qq.id, o);
    else {
      const list = Array.isArray(answers[qq.id]) ? (answers[qq.id] as string[]) : [];
      const others = list.filter(isOther);
      const plain = list.filter((x) => !isOther(x));
      const next = plain.includes(o) ? plain.filter((x) => x !== o) : qq.options.filter((x) => x === o || plain.includes(x));
      setAnswer(qq.id, [...next, ...others]);
    }
  };
  const pickOther = (qq: Question) => {
    const v = answers[qq.id];
    if (qq.type === 'checkbox') {
      const list = Array.isArray(v) ? v : [];
      setAnswer(qq.id, list.some(isOther) ? list.filter((x) => !isOther(x)) : [...list, makeOther('')]);
    } else if (!(typeof v === 'string' && isOther(v))) setAnswer(qq.id, makeOther(''));
    requestAnimationFrame(() => otherField.current?.focus());
  };
  const setOtherText = (qq: Question, text: string) => {
    const v = answers[qq.id];
    if (qq.type === 'checkbox') {
      const list = (Array.isArray(v) ? v : []).filter((x) => !isOther(x));
      setAnswer(qq.id, [...list, makeOther(text)]);
    } else setAnswer(qq.id, makeOther(text));
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    field.current?.focus({ preventScroll: true });
  }, [step]);

  // Pintasan keyboard: A–Z untuk memilih, Enter untuk lanjut.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!q) return;
      const tag = (e.target as HTMLElement).tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if (!typing && (q.type === 'radio' || q.type === 'checkbox') && e.key.length === 1) {
        const k = KEYS.indexOf(e.key.toUpperCase());
        if (k >= 0 && k < q.options.length) {
          e.preventDefault();
          pick(q, q.options[k]);
          return;
        }
        if (k === q.options.length && q.settings?.allow_other) {
          e.preventDefault();
          pickOther(q);
          return;
        }
      }
      if (e.key === 'Enter' && tag !== 'TEXTAREA' && tag !== 'BUTTON' && canNext) {
        e.preventDefault();
        setStep((s) => s + 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const top = (
    <div className="fokus-top">
      <BrandMark brand={p.brand} size={38} className={q ? 'mb-3' : ''} />
      {q && (
        <div className="seg" aria-label={`Pertanyaan ${step + 1} dari ${n}`}>
          {qs.map((x, i) => <span key={x.id} className={i < step || filled(x, answers[x.id]) ? 'done' : ''} />)}
        </div>
      )}
      <svg className="wave" viewBox="0 0 1200 26" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 14 C150 0 300 0 450 12 S750 26 900 12 S1100 2 1200 10 V26 H0Z" fill="#EAF3FD" />
      </svg>
    </div>
  );

  let body: React.ReactNode;
  let nav: React.ReactNode;

  if (step === -1) {
    body = (
      <>
        <div className="q-num">{p.title}</div>
        <h1 className="q-big">
          {p.who ? `Halo, ${greetingName(p.who.name, role)}. ` : 'Selamat datang. '}
          Ada {n} pertanyaan singkat untuk {role === 'siswa' ? 'kamu' : 'Anda'}.
        </h1>
        {p.description && <p className="text-secondary" style={{ whiteSpace: 'pre-line' }}>{p.description}</p>}
        {p.who && (
          <div className="bg-white border rounded-3 p-3 d-flex gap-3 align-items-center mb-3">
            <i className="bi bi-person-check fs-3 text-primary" />
            <div>
              <div className="fw-semibold">{p.who.name}</div>
              <div className="small text-secondary">{p.who.detail}</div>
            </div>
          </div>
        )}
        <p className="text-secondary mb-1">Sekitar {Math.max(2, Math.round(n * 0.5))} menit. Nama tidak ditampilkan di halaman hasil.</p>
        {p.who && <p className="small text-secondary">Bukan {role === 'siswa' ? 'kamu' : 'Anda'}? Tutup halaman ini dan laporkan ke admin sekolah.</p>}
      </>
    );
    nav = (
      <button type="button" className="btn btn-primary btn-lg w-100" onClick={() => setStep(0)} disabled={n === 0}>
        {n === 0 ? 'Tidak ada pertanyaan' : 'Mulai mengisi'}
      </button>
    );
  } else if (q) {
    const v = cur;
    const allowOther = !!q.settings?.allow_other;
    const otherOn = Array.isArray(v) ? v.some(isOther) : typeof v === 'string' && isOther(v);
    const otherVal = otherOn ? otherText((Array.isArray(v) ? v.find(isOther) : v) as string) : '';
    const otherInput = otherOn && (
      <input ref={otherField} className="form-control form-control-lg mb-3" placeholder="Tuliskan jawaban" maxLength={200}
        aria-label={otherLabel(q.settings)} value={otherVal} onChange={(e) => setOtherText(q, e.target.value)} />
    );

    let input: React.ReactNode;
    if (q.type === 'radio' || q.type === 'checkbox') {
      input = (
        <>
          {q.options.map((o, k) => {
            const on = q.type === 'radio' ? v === o : Array.isArray(v) && v.includes(o);
            return (
              <button type="button" key={k} className={`tile ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => pick(q, o)}>
                <span className="key">{q.type === 'checkbox' && on ? <i className="bi bi-check" /> : KEYS[k]}</span>
                {o}
                <i className="bi bi-check-lg tick" />
              </button>
            );
          })}
          {allowOther && (
            <button type="button" className={`tile ${otherOn ? 'on' : ''}`} aria-pressed={otherOn} onClick={() => pickOther(q)}>
              <span className="key">{q.type === 'checkbox' && otherOn ? <i className="bi bi-check" /> : KEYS[q.options.length]}</span>
              {otherLabel(q.settings)}
              <i className="bi bi-pencil tick" />
            </button>
          )}
          {otherInput}
        </>
      );
    } else if (q.type === 'dropdown') {
      const sel = typeof v === 'string' ? (isOther(v) ? OTHER_SELECT : v) : '';
      input = (
        <>
          <select className="form-select form-select-lg mb-3" aria-labelledby="qa" value={sel}
            onChange={(e) => (e.target.value === OTHER_SELECT ? pickOther(q) : setAnswer(q.id, e.target.value))}>
            <option value="" disabled>Pilih jawaban</option>
            {q.options.map((o, k) => <option key={k} value={o}>{o}</option>)}
            {allowOther && <option value={OTHER_SELECT}>{otherLabel(q.settings)}</option>}
          </select>
          {otherInput}
        </>
      );
    } else if (q.type === 'short') {
      input = (
        <input ref={(el) => { field.current = el; }} className="form-control big-input" aria-labelledby="qa" placeholder="Ketik jawaban" maxLength={300}
          value={typeof v === 'string' ? v : ''} onChange={(e) => setAnswer(q.id, e.target.value)} />
      );
    } else if (q.type === 'long') {
      input = (
        <textarea ref={(el) => { field.current = el; }} className="form-control" rows={5} aria-labelledby="qa" placeholder="Tulis jawaban" maxLength={4000}
          value={typeof v === 'string' ? v : ''} onChange={(e) => setAnswer(q.id, e.target.value)} />
      );
    } else if (q.type === 'date') {
      input = (
        <input ref={(el) => { field.current = el; }} type="date" className="form-control form-control-lg" style={{ maxWidth: 280 }} aria-labelledby="qa"
          value={typeof v === 'string' ? v : ''} onChange={(e) => setAnswer(q.id, e.target.value)} />
      );
    } else {
      const r = Array.isArray(v) && v.length === 2 ? v : ['', ''];
      const st = q.settings ?? {};
      input = (
        <div className="d-flex flex-wrap align-items-center gap-2 fs-5">
          <label htmlFor="rA">{startLabel(st)}</label>
          <input id="rA" ref={(el) => { field.current = el; }} type="number" inputMode="numeric" className="form-control form-control-lg" style={{ width: 120 }}
            min={st.min ?? undefined} max={st.max ?? undefined} value={r[0]} onChange={(e) => setAnswer(q.id, [e.target.value, r[1]])} />
          <label htmlFor="rB">{endLabel(st)}</label>
          <input id="rB" type="number" inputMode="numeric" className="form-control form-control-lg" style={{ width: 120 }}
            min={st.min ?? undefined} max={st.max ?? undefined} value={r[1]} onChange={(e) => setAnswer(q.id, [r[0], e.target.value])} />
        </div>
      );
    }

    body = (
      <>
        <div className="q-num">
          Pertanyaan {step + 1} dari {n}{' '}
          {q.required ? <span className="req">*</span> : <span className="text-secondary fw-normal">(boleh dilewati)</span>}
        </div>
        <h1 className="q-big" id="qa">{t(q.title)}</h1>
        {q.type === 'checkbox' && <p className="hint mb-3">Boleh pilih lebih dari satu.</p>}
        {input}
        {prob && <div className="text-danger small mt-2" role="alert"><i className="bi bi-exclamation-circle me-1" />{prob}</div>}
      </>
    );
    const lastKey = KEYS[q.options.length - 1 + (allowOther ? 1 : 0)];
    const hint = q.type === 'radio' ? `Tekan huruf A–${lastKey} untuk memilih` : q.type === 'short' ? 'Tekan Enter untuk lanjut' : '';
    nav = (
      <>
        <button type="button" className="btn btn-light" onClick={() => setStep((s) => s - 1)}>
          <i className="bi bi-arrow-left" /> Kembali
        </button>
        {hint && <span className="hint d-none d-md-inline ms-2">{hint}</span>}
        <button type="button" className="btn btn-primary ms-auto px-4" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
          {step === n - 1 ? 'Periksa jawaban' : !q.required && !filled(q, v) ? 'Lewati' : 'Lanjut'}
        </button>
      </>
    );
  } else {
    body = (
      <>
        <div className="q-num">Hampir selesai</div>
        <h1 className="q-big">Periksa jawaban sebelum dikirim</h1>
        <div className="bg-white border rounded-3 mb-3">
          {qs.map((x, i) => (
            <div key={x.id} className={`p-3 d-flex gap-3 ${i ? 'border-top' : ''}`}>
              <div className="flex-grow-1 min-w-0">
                <div className="small text-secondary">{i + 1}. {t(x.title)}</div>
                <div className="fw-semibold" style={{ overflowWrap: 'anywhere' }}>{fmtAnswer(x, answers[x.id])}</div>
              </div>
              <button type="button" className="btn btn-sm btn-link" onClick={() => setStep(i)}>Ubah</button>
            </div>
          ))}
        </div>
        {p.extra}
        {p.error && <div className="alert alert-danger" role="alert">{p.error}</div>}
        {p.preview && <div className="alert alert-info small">Mode pratinjau: jawaban tidak disimpan.</div>}
      </>
    );
    nav = (
      <>
        <button type="button" className="btn btn-light" onClick={() => setStep(n - 1)}>
          <i className="bi bi-arrow-left" /> Kembali
        </button>
        <button type="button" className="btn btn-primary ms-auto px-4" onClick={p.onSubmit} disabled={p.submitting || !p.canSubmit}>
          {p.submitting && <span className="spinner-border spinner-border-sm me-2" />}
          {p.submitting ? 'Mengirim…' : 'Kirim jawaban'}
        </button>
      </>
    );
  }

  return (
    <>
      <div className="fokus">
        {top}
        <div className="fokus-body">
          {body}
          <Credit creator={p.brand.creator} />
        </div>
      </div>
      <div className="fokus-nav"><div className="inner">{nav}</div></div>
    </>
  );
}
