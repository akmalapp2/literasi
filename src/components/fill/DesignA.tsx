'use client';

import { useEffect, useRef, useState } from 'react';
import { BrandMark } from '@/components/Brand';
import { KEYS, fmtAnswer, isAnswered, personalize } from '@/lib/text';
import type { Question } from '@/lib/types';
import type { DesignProps } from './types';

/** Desain A — satu pertanyaan per layar. */
export default function DesignA(p: DesignProps) {
  const { questions: qs, answers, setAnswer, role } = p;
  const n = qs.length;
  const [step, setStep] = useState(-1); // -1 pembuka, 0..n-1 pertanyaan, n periksa
  const t = (s: string) => personalize(s, role);
  const field = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const q: Question | undefined = step >= 0 && step < n ? qs[step] : undefined;
  const canNext = !q || !q.required || isAnswered(answers[q.id]);

  const pick = (qq: Question, o: string) => {
    if (qq.type === 'radio') setAnswer(qq.id, o);
    else {
      const cur = Array.isArray(answers[qq.id]) ? (answers[qq.id] as string[]) : [];
      const next = cur.includes(o) ? cur.filter((x) => x !== o) : qq.options.filter((x) => x === o || cur.includes(x));
      setAnswer(qq.id, next);
    }
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
          {qs.map((x, i) => <span key={x.id} className={i < step || isAnswered(answers[x.id]) ? 'done' : ''} />)}
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
          {p.who ? `Halo, ${role === 'siswa' ? p.who.name.split(/\s+/)[0] : 'Bapak/Ibu'}. ` : 'Selamat datang. '}
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
    const v = answers[q.id];
    let input: React.ReactNode;
    if (q.type === 'radio' || q.type === 'checkbox') {
      input = q.options.map((o, k) => {
        const on = q.type === 'radio' ? v === o : Array.isArray(v) && v.includes(o);
        return (
          <button type="button" key={k} className={`tile ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => pick(q, o)}>
            <span className="key">{q.type === 'checkbox' && on ? <i className="bi bi-check" /> : KEYS[k]}</span>
            {o}
            <i className="bi bi-check-lg tick" />
          </button>
        );
      });
    } else if (q.type === 'dropdown') {
      input = (
        <select className="form-select form-select-lg" aria-labelledby="qa" value={typeof v === 'string' ? v : ''} onChange={(e) => setAnswer(q.id, e.target.value)}>
          <option value="" disabled>Pilih jawaban</option>
          {q.options.map((o, k) => <option key={k} value={o}>{o}</option>)}
        </select>
      );
    } else if (q.type === 'short') {
      input = (
        <input ref={(el) => { field.current = el; }} className="form-control big-input" aria-labelledby="qa" placeholder="Ketik jawaban" maxLength={300}
          value={typeof v === 'string' ? v : ''} onChange={(e) => setAnswer(q.id, e.target.value)} />
      );
    } else {
      input = (
        <textarea ref={(el) => { field.current = el; }} className="form-control" rows={5} aria-labelledby="qa" placeholder="Tulis jawaban" maxLength={4000}
          value={typeof v === 'string' ? v : ''} onChange={(e) => setAnswer(q.id, e.target.value)} />
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
      </>
    );
    const hint = q.type === 'radio' ? `Tekan huruf A–${KEYS[q.options.length - 1]} untuk memilih` : q.type === 'short' ? 'Tekan Enter untuk lanjut' : '';
    nav = (
      <>
        <button type="button" className="btn btn-light" onClick={() => setStep((s) => s - 1)}>
          <i className="bi bi-arrow-left" /> Kembali
        </button>
        {hint && <span className="hint d-none d-md-inline ms-2">{hint}</span>}
        <button type="button" className="btn btn-primary ms-auto px-4" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
          {step === n - 1 ? 'Periksa jawaban' : !q.required && !isAnswered(v) ? 'Lewati' : 'Lanjut'}
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
                <div className="fw-semibold" style={{ overflowWrap: 'anywhere' }}>{fmtAnswer(answers[x.id])}</div>
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
        <div className="fokus-body">{body}</div>
      </div>
      <div className="fokus-nav"><div className="inner">{nav}</div></div>
    </>
  );
}
