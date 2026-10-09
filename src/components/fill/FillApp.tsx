'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { submitAnswers } from '@/actions/public';
import { BrandMark } from '@/components/Brand';
import { ROLE_LABEL, greetingName } from '@/lib/text';
import type { RepeatMode } from '@/lib/period';
import type { AnswerValue, Answers, Brand, FillDesign, Question, Role } from '@/lib/types';
import DesignA from './DesignA';
import DesignB from './DesignB';
import Turnstile from './Turnstile';
import type { Who } from './types';
import { uid } from '@/components/editor/shared';
import Credit from '@/components/Credit';

type Props = {
  brand: Brand;
  form: { id: string; title: string; description: string; slug: string; showResultsLink: boolean; repeatMode?: RepeatMode };
  questions: Question[];
  design: FillDesign;
  targets: Role[];
  mode: 'token' | 'terbuka' | 'preview';
  respondent?: { name: string; role: Role; detail: string } | null;
  token?: string | null;
  turnstileSiteKey?: string | null;
  /** Peran yang sudah dipilih sebelumnya (halaman masuk / pratinjau). */
  presetRole?: Role;
  /** Kode angket (link umum + peran anonim), diteruskan ke server saat mengirim. */
  code?: string | null;
};

export default function FillApp(props: Props) {
  const { brand, form, questions, design, targets, mode, respondent, token, turnstileSiteKey } = props;
  const [role, setRole] = useState<Role | null>(
    respondent?.role ?? props.presetRole ?? (targets.length === 1 ? targets[0] : null),
  );
  const [answers, setAnswers] = useState<Answers>({});
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tsToken, setTsToken] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();

  const needTs = mode === 'terbuka' && !!turnstileSiteKey;
  const qs = useMemo(
    () => (role ? questions.filter((q) => q.roles.includes(role)).map((q) => ({ ...q, settings: q.settings ?? {} })) : []),
    [questions, role],
  );

  useEffect(() => {
    if (mode !== 'terbuka') return;
    try {
      let id = localStorage.getItem('gls-device');
      if (!id) {
        id = uid();
        localStorage.setItem('gls-device', id);
      }
      setDeviceId(id);
    } catch {
      setDeviceId(uid());
    }
  }, [mode]);

  const setAnswer = (id: string, v: AnswerValue) => {
    setAnswers((a) => ({ ...a, [id]: v }));
    setError(null);
  };

  const onSubmit = () => {
    if (mode === 'preview') {
      setDone(true);
      return;
    }
    startSubmit(async () => {
      const r = await submitAnswers({
        formId: form.id,
        token: mode === 'token' ? token : null,
        deviceId: mode === 'terbuka' ? deviceId : null,
        role: mode === 'terbuka' ? role : null,
        answers,
        turnstileToken: tsToken,
        code: mode === 'terbuka' ? props.code ?? null : null,
      });
      if (r.ok) {
        setDone(true);
        window.scrollTo(0, 0);
      } else setError(r.error);
    });
  };

  if (done) {
    return (
      <div className="fokus">
        <div className="fokus-top">
          <BrandMark brand={brand} size={38} />
          <svg className="wave" viewBox="0 0 1200 26" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 14 C150 0 300 0 450 12 S750 26 900 12 S1100 2 1200 10 V26 H0Z" fill="#EAF3FD" />
          </svg>
        </div>
        <div className="fokus-body text-center">
          <div className="d-inline-grid rounded-circle mb-3" style={{ width: 76, height: 76, placeItems: 'center', background: '#E1F2EA', color: 'var(--hijau)', fontSize: '2.3rem' }}>
            <i className="bi bi-check-lg" />
          </div>
          <h1 className="q-big mb-2">Jawaban terkirim</h1>
          <p className="text-secondary">
            Terima kasih{respondent ? `, ${greetingName(respondent.name, respondent.role)}` : ''}.{' '}
            {mode === 'token'
              ? form.repeatMode === 'mingguan' ? 'Link ini bisa dipakai lagi minggu depan.'
                : form.repeatMode === 'harian' ? 'Link ini bisa dipakai lagi besok.'
                : 'Link ini sudah tidak bisa dipakai lagi.'
              : mode === 'preview' ? '(Mode pratinjau, tidak ada yang disimpan.)' : ''}
          </p>
          {form.showResultsLink && mode !== 'preview' && (
            <Link className="btn btn-outline-primary" href={`/hasil/${form.slug}`}>Lihat hasil sementara</Link>
          )}
          <Credit creator={brand.creator} />
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="fokus">
        <div className="fokus-top">
          <BrandMark brand={brand} size={38} />
          <svg className="wave" viewBox="0 0 1200 26" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 14 C150 0 300 0 450 12 S750 26 900 12 S1100 2 1200 10 V26 H0Z" fill="#EAF3FD" />
          </svg>
        </div>
        <div className="fokus-body">
          <div className="q-num">{form.title}</div>
          <h1 className="q-big">Anda mengisi sebagai…</h1>
          {targets.map((r, k) => (
            <button type="button" key={r} className="tile" onClick={() => setRole(r)}>
              <span className="key">{String.fromCharCode(65 + k)}</span>
              {ROLE_LABEL[r]}
              <i className="bi bi-chevron-right tick" style={{ visibility: 'visible' }} />
            </button>
          ))}
          <Credit creator={brand.creator} />
        </div>
      </div>
    );
  }

  const who: Who = respondent ? { name: respondent.name, detail: respondent.detail } : null;
  const common = {
    brand,
    title: form.title,
    description: form.description,
    questions: qs,
    role,
    who,
    answers,
    setAnswer,
    onSubmit,
    submitting,
    error,
    canSubmit: !needTs || !!tsToken,
    extra: needTs ? <Turnstile siteKey={turnstileSiteKey!} onToken={setTsToken} /> : null,
    preview: mode === 'preview',
  };
  return design === 'B' ? <DesignB {...common} /> : <DesignA {...common} />;
}
