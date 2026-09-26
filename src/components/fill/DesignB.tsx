'use client';

import { useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/Brand';
import { fmtAnswer, isChoice, personalize } from '@/lib/text';
import type { DesignProps } from './types';

/** Desain B — percakapan (chat). */
export default function DesignB(p: DesignProps) {
  const { questions: qs, answers, setAnswer, role, brand } = p;
  const n = qs.length;
  const [idx, setIdx] = useState(0);
  const [typing, setTyping] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const [text, setText] = useState('');
  const thread = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const t = (s: string) => personalize(s, role);
  const q = idx < n ? qs[idx] : undefined;
  const textMode = !typing && !!q && !isChoice(q.type);

  useEffect(() => {
    const el = thread.current;
    if (el) el.scrollTop = el.scrollHeight;
    if (textMode) input.current?.focus({ preventScroll: true });
  }, [idx, typing, p.error, textMode]);

  const answer = (v: string | string[]) => {
    if (!q) return;
    setAnswer(q.id, v);
    setSel([]);
    setText('');
    setTyping(true);
    setIdx((i) => i + 1);
    setTimeout(() => setTyping(false), 550);
  };

  const greet = p.who ? (role === 'siswa' ? p.who.name.split(/\s+/)[0] : 'Bapak/Ibu') : role === 'siswa' ? 'kamu' : 'Bapak/Ibu';
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
    bot('hello', <>Halo, {greet}! Ini angket <strong>{p.title}</strong>. Ada {n} pertanyaan singkat.{p.description ? <><br /><span className="text-secondary">{p.description}</span></> : null}</>),
  ];
  for (let i = 0; i < Math.min(idx, n); i++) {
    items.push(bot(`q${i}`, qLabel(i)));
    items.push(
      <div className="msg me" key={`a${i}`}>
        <button type="button" className="bubble" title="Ketuk untuk mengubah" onClick={() => { setIdx(i); setTyping(false); }}>
          {fmtAnswer(answers[qs[i].id])}
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
    if (q.type === 'radio' || q.type === 'dropdown') {
      chips = q.options.map((o, k) => (
        <button type="button" key={k} className={`chip ${answers[q.id] === o ? 'on' : ''}`} onClick={() => answer(o)}>{o}</button>
      ));
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
          <button type="button" className="btn btn-primary btn-sm rounded-pill px-3" disabled={q.required && !sel.length} onClick={() => answer(sel)}>
            {sel.length ? 'Kirim pilihan' : 'Lewati'}
          </button>
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
          <button type="button" className="chip" onClick={() => setIdx(0)}>Ulang dari awal</button>
        </div>
      </div>
    );
  }

  const sendText = () => {
    if (!q) return;
    const v = text.trim();
    if (!v && q.required) return;
    answer(v);
  };

  return (
    <div className="obrolan">
      <div className="ob-head d-flex align-items-center gap-2">
        <Logo brand={brand} size={38} alt={`Logo ${brand.schoolName}`} />
        <div className="flex-grow-1 min-w-0">
          <div className="fw-bold lh-sm text-truncate">{brand.appName}</div>
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
        <div className="inner">
          {q && q.type === 'long' && textMode ? (
            <textarea ref={(el) => { input.current = el; }} className="form-control" rows={2} placeholder="Tulis jawaban" maxLength={4000}
              value={text} onChange={(e) => setText(e.target.value)} aria-label="Jawaban" />
          ) : (
            <input ref={(el) => { input.current = el; }} className="form-control" disabled={!textMode} maxLength={300}
              placeholder={textMode ? 'Ketik jawaban' : 'Pilih jawaban di atas'} value={text} aria-label="Jawaban"
              onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); sendText(); } }} />
          )}
          <button type="button" className="btn btn-primary" disabled={!textMode || (!!q?.required && !text.trim())} onClick={sendText} title="Kirim" aria-label="Kirim jawaban">
            <i className="bi bi-send-fill" />
          </button>
        </div>
      </div>
    </div>
  );
}
