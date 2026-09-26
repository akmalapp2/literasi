'use client';

import { Logo } from '@/components/Brand';
import { endLabel, otherLabel, startLabel } from '@/lib/answers';
import { KEYS, isChoice, personalize } from '@/lib/text';
import type { Brand, FillDesign, Question } from '@/lib/types';

type Props = { brand: Brand; q: Question | null; index: number; total: number; design: FillDesign; title: string };

/** Pratinjau mini (contoh sebagai siswa) di dalam bingkai HP. */
export default function PhonePreview({ brand, q, index, total, design, title }: Props) {
  const text = q ? personalize(q.title, 'siswa') : '';

  if (design === 'A') {
    let body: React.ReactNode;
    if (!q) {
      body = (
        <>
          <div className="q-num small">{title}</div>
          <div className="fw-bold my-2" style={{ fontSize: '1.05rem' }}>Halo, Andi. Ada {total} pertanyaan singkat.</div>
          <div className="bg-white border rounded-3 p-2 small">Andi Pratama<br /><span className="text-secondary">Siswa, kelas XI NKPI 1</span></div>
        </>
      );
    } else {
      let input: React.ReactNode;
      const other = q.settings?.allow_other;
      if (q.type === 'radio' || q.type === 'checkbox')
        input = (
          <>
            {q.options.map((o, k) => (
              <div key={k} className="tile"><span className="key">{KEYS[k]}</span>{o || <span className="text-secondary">(kosong)</span>}</div>
            ))}
            {other && (
              <div className="tile"><span className="key">{KEYS[q.options.length]}</span>{otherLabel(q.settings)} …</div>
            )}
          </>
        );
      else if (q.type === 'dropdown')
        input = (
          <select className="form-select form-select-sm" aria-label="Pratinjau" defaultValue="">
            <option value="" disabled>Pilih jawaban</option>
            {q.options.map((o, k) => <option key={k}>{o}</option>)}
            {other && <option>{otherLabel(q.settings)} …</option>}
          </select>
        );
      else if (q.type === 'date') input = <input type="date" className="form-control" aria-label="Pratinjau" />;
      else if (q.type === 'range')
        input = (
          <div className="d-flex flex-wrap align-items-center gap-2">
            <span>{startLabel(q.settings)}</span>
            <input className="form-control form-control-sm" style={{ width: 64 }} placeholder="2" aria-label="Awal" />
            <span>{endLabel(q.settings)}</span>
            <input className="form-control form-control-sm" style={{ width: 64 }} placeholder="10" aria-label="Akhir" />
          </div>
        );
      else if (q.type === 'short') input = <input className="form-control big-input" style={{ fontSize: '.95rem' }} placeholder="Ketik jawaban" aria-label="Pratinjau" />;
      else input = <textarea className="form-control" rows={4} placeholder="Tulis jawaban" aria-label="Pratinjau" />;
      body = (
        <>
          <div className="q-num small">Pertanyaan {index + 1} dari {total} {q.required ? <span className="req">*</span> : null}</div>
          <div className="fw-bold my-2" style={{ fontSize: '1.05rem', lineHeight: 1.3 }}>{text}</div>
          {q.type === 'checkbox' && <div className="hint mb-2">Boleh pilih lebih dari satu</div>}
          {input}
        </>
      );
    }
    return (
      <div className="hp"><div className="hp-screen">
        <div className="d-flex align-items-center gap-2" style={{ background: 'var(--laut)', color: '#fff', padding: '12px 12px 8px' }}>
          <Logo brand={brand} size={26} />
          <div className="fw-bold lh-sm" style={{ fontSize: '.8rem' }}>{brand.appName}<div className="brand-sub">{brand.schoolName}</div></div>
        </div>
        <div className="seg px-3 py-2" style={{ background: 'var(--laut)' }}>
          {Array.from({ length: total }, (_, i) => <span key={i} className={i < index ? 'done' : ''} />)}
        </div>
        <div className="p-3 flex-grow-1 overflow-auto">{body}</div>
        <div className="bg-white border-top p-2 d-flex">
          <span className="btn btn-sm btn-light">Kembali</span>
          <span className="btn btn-sm btn-primary ms-auto px-3">{q ? 'Lanjut' : 'Mulai'}</span>
        </div>
      </div></div>
    );
  }

  const textMode = !!q && !isChoice(q.type);
  return (
    <div className="hp"><div className="hp-screen">
      <div className="bg-white border-bottom d-flex align-items-center gap-2 p-2">
        <Logo brand={brand} size={26} />
        <div className="fw-bold lh-sm" style={{ fontSize: '.8rem' }}>{brand.appName}<div className="text-secondary fw-normal" style={{ fontSize: '.7rem' }}>{brand.schoolName}</div></div>
      </div>
      <div className="flex-grow-1 overflow-auto p-2" style={{ background: '#EDF2F8' }}>
        <div className="msg bot">
          <Logo brand={brand} size={26} />
          <div className="bubble">
            {q ? (
              <>
                <div className="text-secondary" style={{ fontSize: '.72rem' }}>Pertanyaan {index + 1} dari {total}</div>
                {text}
              </>
            ) : (
              <>Halo, Andi! Ada {total} pertanyaan singkat tentang literasi.</>
            )}
          </div>
        </div>
        {q && isChoice(q.type) && (
          <div className="chips" style={{ marginLeft: 34 }}>
            {q.options.map((o, k) => <span key={k} className="chip">{o}</span>)}
            {q.settings?.allow_other && <span className="chip">{otherLabel(q.settings)} …</span>}
            {q.type === 'checkbox' && <span className="btn btn-primary btn-sm rounded-pill">Kirim pilihan</span>}
          </div>
        )}
      </div>
      <div className="bg-white border-top p-2 d-flex gap-2 align-items-center">
        {q?.type === 'date' ? (
          <input type="date" className="form-control form-control-sm" aria-label="Pratinjau" />
        ) : q?.type === 'range' ? (
          <>
            <input className="form-control form-control-sm" placeholder={startLabel(q.settings)} aria-label="Awal" />
            <span className="small">–</span>
            <input className="form-control form-control-sm" placeholder={endLabel(q.settings)} aria-label="Akhir" />
          </>
        ) : (
          <input className="form-control form-control-sm" disabled={!textMode} placeholder={textMode ? 'Ketik jawaban' : 'Pilih jawaban di atas'} aria-label="Pratinjau" />
        )}
        <span className={`btn btn-sm btn-primary ${textMode ? '' : 'disabled'}`}><i className="bi bi-send-fill" /></span>
      </div>
    </div></div>
  );
}
