'use client';

import { useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/Brand';
import { endLabel, filled, fmtAnswer, makeOther, otherLabel, problem, startLabel } from '@/lib/answers';
import { addressee, greetingName, personalize } from '@/lib/text';
import type { DesignProps } from './types';
import Credit from '@/components/Credit';

type InputKind = 'none' | 'text' | 'long' | 'date' | 'range' | 'other';

/** Desain B — percakapan (chat). */
export default function DesignB(p: DesignProps) {
  const { questions: qs, answers, setAnswer, role, brand } = p;
  const n = qs.length;
  const [idx, setIdx] = useState(0);
  const [typing, setTyping] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [date, setDate] = useState('');
  const [rng, setRng] = useState<[string, string]>(['', '']);
  const [otherMode, setOtherMode] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const thread = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const t = (s: string) => personalize(s, role);
  const q = idx < n ? qs[idx] : undefined;

  const kind: InputKind =
    typing || !q
      ? 'none'
      : q.type === 'radio' || q.type === 'checkbox' || q.type === 'dropdown'
        ? otherMode ? 'other' : 'none'
        : q.type === 'short' ? 'text' : q.type === 'long' ? 'long' : q.type === 'date' ? 'date' : 'range';

  useEffect(() => {
    const el = thread.current;
    if (el) el.scrollTop = el.scrollHeight;
    if (kind !== 'none') input.current?.focus({ preventScroll: true });
  }, [idx, typing, p.error, kind, localErr]);

  const reset = () => {
    setSel([]);
    setText('');
    setDate('');
    setRng(['', '']);
    setOtherMode(false);
    setLocalErr(null);
  };

  const answer = (v: string | string[]) => {
    if (!q) return;
    setAnswer(q.id, v);
    reset();
    setTyping(true);
    setIdx((i) => i + 1);
    setTimeout(() => setTyping(false), 550);
  };

  const greet = p.who ? greetingName(p.who.name, role) : addressee(role);
  const qLabel = (i: number) => {
    const x = qs[i];
    return (
      <>
        <div className="small text-secondary mb-1">
          Pertanyaan {i + 1} dari {n}
          {!x.required && ', boleh dilewati'}
          {x.type === 'checkbox' && ', boleh pilih lebih dari satu'}
        </div>
        {t(x.title)}
      </>
    );
  };
  const bot = (key: string, content: React.ReactNode) => (
    <div className="msg bot" key={key}>
      <Logo brand={brand} size={34} />
      <div className="bubble">{content}</div>
    </div>
  );

  const items: React.ReactNode[] = [
    bot('hello', <>Halo, {greet}! Selamat datang di <strong>{p.title}</strong>. Ada {n} pertanyaan singkat.{p.description ? <><br /><span className="text-secondary">{p.description}</span></> : null}</>),
  ];
  for (let i = 0; i < Math.min(idx, n); i++) {
    items.push(bot(`q${i}`, qLabel(i)));
    items.push(
      <div className="msg me" key={`a${i}`}>
        <button type="button" className="bubble" title="Ketuk untuk mengubah" onClick={() => { reset(); setIdx(i); setTyping(false); }}>
          {fmtAnswer(qs[i], answers[qs[i].id])}
        </button>
      </div>,
    );
  }

  let chips: React.ReactNode = null;
  if (typing) {
    items.push(
      <div className="msg bot" key="typing">
        <Logo brand={brand} size={34} />
        <div className="bubble typing" aria-label="Sedang mengetik"><span /><span /><span /></div>
      </div>,
    );
  } else if (q) {
    items.push(bot(`q${idx}`, qLabel(idx)));
    const allowOther = !!q.settings?.allow_other;
    const otherChip = allowOther && (
      <button type="button" className={`chip ${otherMode ? 'on' : ''}`} aria-pressed={otherMode} onClick={() => setOtherMode((m) => !m)}>
        <i className="bi bi-pencil me-1" />{otherLabel(q.settings)}
      </button>
    );
    if (q.type === 'radio' || q.type === 'dropdown') {
      chips = (
        <>
          {q.options.map((o, k) => (
            <button type="button" key={k} className={`chip ${answers[q.id] === o ? 'on' : ''}`} onClick={() => answer(o)}>{o}</button>
          ))}
          {otherChip}
          {!q.required && <button type="button" className="chip" onClick={() => answer('')}>Lewati</button>}
        </>
      );
    } else if (q.type === 'checkbox') {
      chips = (
        <>
          {q.options.map((o, k) => {
            const on = sel.includes(o);
            return (
              <button type="button" key={k} className={`chip ${on ? 'on' : ''}`} aria-pressed={on}
                onClick={() => setSel((s) => (on ? s.filter((x) => x !== o) : q.options.filter((x) => x === o || s.includes(x))))}>
                {on && <i className="bi bi-check me-1" />}{o}
              </button>
            );
          })}
          {otherChip}
          {!otherMode && (
            <button type="button" className="btn btn-primary btn-sm rounded-pill px-3" disabled={q.required && !sel.length} onClick={() => answer(sel)}>
              {sel.length ? 'Kirim pilihan' : 'Lewati'}
            </button>
          )}
        </>
      );
    } else if (!q.required) {
      chips = <button type="button" className="chip" onClick={() => answer('')}>Lewati</button>;
    }
  } else {
    items.push(bot('confirm', <>Semua pertanyaan sudah terjawab. Kirim jawaban sekarang? Ketuk jawaban {role === 'siswa' ? 'kamu' : 'Anda'} di atas jika ingin mengubah.</>));
    chips = (
      <div className="w-100">
        {p.extra}
        {p.error && <div className="alert alert-danger py-2 small" role="alert">{p.error}</div>}
        {p.preview && <div className="alert alert-info py-2 small">Mode pratinjau: jawaban tidak disimpan.</div>}
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary rounded-pill px-4" onClick={p.onSubmit} disabled={p.submitting || !p.canSubmit}>
            {p.submitting && <span className="spinner-border spinner-border-sm me-2" />}
            {p.submitting ? 'Mengirim…' : 'Kirim jawaban'}
          </button>
          <button type="button" className="chip" onClick={() => { reset(); setIdx(0); }}>Ulang dari awal</button>
        </div>
      </div>
    );
  }

  /** Kirim isian dari kotak bawah. */
  const send = () => {
    if (!q) return;
    setLocalErr(null);
    if (kind === 'other') {
      const typed = text.trim();
      if (!typed) return setLocalErr('Tuliskan jawaban lainnya.');
      return answer(q.type === 'checkbox' ? [...sel, makeOther(typed)] : makeOther(typed));
    }
    if (kind === 'text' || kind === 'long') {
      const v = text.trim();
      if (!v && q.required) return;
      return answer(v);
    }
    if (kind === 'date') {
      if (!date && q.required) return;
      const err = problem(q, date);
      if (err) return setLocalErr(err);
      return answer(date);
    }
    if (kind === 'range') {
      const v = [rng[0], rng[1]];
      if (q.required && !filled(q, v)) return setLocalErr('Lengkapi kedua angka.');
      const err = problem(q, v);
      if (err) return setLocalErr(err);
      return answer(v);
    }
  };
  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      send();
    }
  };
  const canSend =
    kind === 'other' ? !!text.trim()
      : kind === 'text' || kind === 'long' ? !q?.required || !!text.trim()
        : kind === 'date' ? !q?.required || !!date
          : kind === 'range' ? !!rng[0].trim() || !!rng[1].trim() || !q?.required
            : false;

  let bar: React.ReactNode;
  if (kind === 'long') {
    bar = (
      <textarea ref={(el) => { input.current = el; }} className="form-control" rows={2} placeholder="Tulis jawaban" maxLength={4000}
        value={text} onChange={(e) => setText(e.target.value)} aria-label="Jawaban" />
    );
  } else if (kind === 'date') {
    bar = (
      <input ref={(el) => { input.current = el; }} type="date" className="form-control" value={date} aria-label="Tanggal"
        onChange={(e) => setDate(e.target.value)} onKeyDown={onEnter} />
    );
  } else if (kind === 'range' && q) {
    bar = (
      <div className="d-flex align-items-center gap-2 flex-grow-1 min-w-0">
        <input ref={(el) => { input.current = el; }} type="number" inputMode="numeric" className="form-control" placeholder={startLabel(q.settings)}
          aria-label={startLabel(q.settings)} value={rng[0]} onChange={(e) => setRng([e.target.value, rng[1]])} onKeyDown={onEnter} />
        <span className="small text-secondary text-nowrap">{endLabel(q.settings)}</span>
        <input type="number" inputMode="numeric" className="form-control" placeholder="…" aria-label={endLabel(q.settings)}
          value={rng[1]} onChange={(e) => setRng([rng[0], e.target.value])} onKeyDown={onEnter} />
      </div>
    );
  } else {
    bar = (
      <input ref={(el) => { input.current = el; }} className="form-control" disabled={kind === 'none'} maxLength={kind === 'other' ? 200 : 300}
        placeholder={kind === 'other' && q ? otherLabel(q.settings) : kind === 'text' ? 'Ketik jawaban' : 'Pilih jawaban di atas'}
        value={text} aria-label="Jawaban" onChange={(e) => setText(e.target.value)} onKeyDown={onEnter} />
    );
  }

  return (
    <div className="obrolan">
      <div className="ob-head d-flex align-items-center gap-2">
        <Logo brand={brand} size={38} alt={`Logo ${brand.schoolName}`} />
        <div className="flex-grow-1 min-w-0">
          <div className="fw-bold lh-sm">{brand.appName}</div>
          <div className="small text-secondary text-truncate">{brand.schoolName}</div>
        </div>
        {p.who && (
          <div className="text-end small d-none d-sm-block">
            <div className="fw-semibold">{p.who.name}</div>
            <div className="text-secondary">{p.who.detail}</div>
          </div>
        )}
      </div>
      <div className="progress rounded-0" style={{ height: 4 }}>
        <div className="progress-bar" style={{ width: `${n ? Math.round((Math.min(idx, n) / n) * 100) : 0}%` }} />
      </div>
      <div className="ob-thread" ref={thread}>
        <div className="inner">
          {items}
          {chips && <div className="chips">{chips}</div>}
        </div>
      </div>
      <div className="ob-input">
        {localErr && <div className="inner small text-danger mb-1" role="alert"><i className="bi bi-exclamation-circle me-1" />{localErr}</div>}
        <div className="inner">
          {bar}
          <button type="button" className="btn btn-primary" disabled={kind === 'none' || !canSend} onClick={send} title="Kirim" aria-label="Kirim jawaban">
            <i className="bi bi-send-fill" />
          </button>
        </div>
        <Credit />
      </div>
    </div>
  );
}
