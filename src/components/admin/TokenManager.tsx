'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { allowRefill, generateTokens, regenerateToken } from '@/actions/tokens';
import CopyButton from '@/components/CopyButton';
import { PERIOD_WORD, REPEAT_LABEL, periodKey, periodLabel, usedThisPeriod, type RepeatMode } from '@/lib/period';
import Toast, { type ToastMsg } from '@/components/Toast';
import { ROLE_LABEL, ROLE_SHORT, formatDate, greetingName } from '@/lib/text';
import type { Respondent, Role } from '@/lib/types';

export type TokenRow = { id: string; token: string; used_at: string | null; respondents: Respondent };

type Props = { formId: string; formTitle: string; tokens: TokenRow[]; eligible: number; baseUrl: string; targets: Role[]; repeatMode: RepeatMode };

function waLink(phone: string | null, text: string) {
  let p = (phone ?? '').replace(/[^\d]/g, '');
  if (p.startsWith('0')) p = '62' + p.slice(1);
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}

export default function TokenManager({ formId, formTitle, tokens, eligible, baseUrl, targets, repeatMode }: Props) {
  /** Sudah mengisi pada periode sekarang (sekali / minggu ini / hari ini). */
  const isDone = (t: TokenRow) => usedThisPeriod(repeatMode, t.used_at);
  const word = PERIOD_WORD[repeatMode];
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [kelas, setKelas] = useState('');
  const [status, setStatus] = useState('');
  const [msg, setMsg] = useState<ToastMsg>(null);
  const [pending, start] = useTransition();

  const classes = useMemo(
    () => Array.from(new Set(tokens.map((t) => t.respondents.class_name).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, 'id')),
    [tokens],
  );
  const rows = tokens.filter((t) => {
    const r = t.respondents;
    if (role && r.role !== role) return false;
    if (kelas && r.class_name !== kelas) return false;
    if (status === 'sudah' && !isDone(t)) return false;
    if (status === 'belum' && isDone(t)) return false;
    if (q && !`${r.name} ${r.identifier}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? { type: 'ok', text: r.message ?? 'Selesai.' } : { type: 'error', text: r.error ?? 'Gagal.' });
    });

  const url = (t: TokenRow) => `${baseUrl}/isi/${t.token}`;
  const waText = (t: TokenRow) =>
    `Yth. ${greetingName(t.respondents.name, t.respondents.role) === 'Bapak/Ibu' ? 'Bapak/Ibu ' + t.respondents.name : t.respondents.name}, mohon mengisi "${formTitle}" melalui link pribadi berikut: ${url(t)} (link hanya untuk Anda dan hanya bisa dipakai sekali). Terima kasih.`;

  const qp = new URLSearchParams();
  if (role) qp.set('peran', role);
  if (kelas) qp.set('kelas', kelas);
  if (status === 'belum') qp.set('belum', '1');
  const qrHref = `/admin/angket/${formId}/kartu-qr${qp.toString() ? `?${qp.toString()}` : ''}`;

  const done = tokens.filter(isDone).length;
  const missing = Math.max(0, eligible - tokens.length);

  return (
    <>
      {repeatMode !== 'sekali' && (
        <div className="alert alert-info small py-2">
          <i className="bi bi-arrow-repeat me-1" />
          Angket ini diisi <strong>{REPEAT_LABEL[repeatMode].toLowerCase()}</strong>. Status di bawah menunjukkan pengisian
          <strong> {word} ({periodLabel(periodKey(repeatMode))})</strong>. Link yang sama dipakai lagi pada periode berikutnya.
        </div>
      )}
      <div className="row g-3 mb-3">
        {targets.map((r) => {
          const all = tokens.filter((t) => t.respondents.role === r);
          return (
            <div key={r} className="col-6 col-md-3">
              <div className="card border-0 shadow-sm stat-card"><div className="card-body">
                <div className="small text-secondary">{ROLE_LABEL[r]}</div>
                <div className="num">{all.filter(isDone).length} / {all.length}</div>
              </div></div>
            </div>
          );
        })}
        <div className="col-6 col-md-3">
          <div className="card border-0 shadow-sm stat-card"><div className="card-body">
            <div className="small text-secondary">Belum mengisi{word ? ` ${word}` : ''}</div>
            <div className="num text-danger">{tokens.length - done}</div>
          </div></div>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-3"><div className="card-body d-flex flex-wrap align-items-center gap-2">
        <div className="me-auto small">
          {missing > 0 ? (
            <><i className="bi bi-exclamation-circle text-warning me-1" />{missing} responden sasaran belum punya link.</>
          ) : (
            <><i className="bi bi-check-circle text-success me-1" />Semua responden sasaran sudah punya link.</>
          )}
        </div>
        <button type="button" className="btn btn-primary" disabled={pending} onClick={() => run(() => generateTokens(formId))}>
          {pending ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-magic me-1" />}
          Buat link untuk semua responden
        </button>
        <Link className="btn btn-outline-primary" href={qrHref}><i className="bi bi-qr-code me-1" />Cetak kartu QR</Link>
        <Link className="btn btn-outline-primary" href={`/admin/angket/${formId}/laporan`}><i className="bi bi-download me-1" />Unduh hasil (PDF/Excel)</Link>
      </div></div>

      <div className="d-flex flex-wrap gap-2 mb-3">
        <input className="form-control" style={{ maxWidth: 260 }} placeholder="Cari nama / NIT / NIP" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari" />
        <select className="form-select" style={{ maxWidth: 180 }} value={role} onChange={(e) => setRole(e.target.value)} aria-label="Peran">
          <option value="">Semua peran</option>
          {targets.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
        {classes.length > 0 && (
          <select className="form-select" style={{ maxWidth: 180 }} value={kelas} onChange={(e) => setKelas(e.target.value)} aria-label="Kelas">
            <option value="">Semua kelas</option>
            {classes.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <select className="form-select" style={{ maxWidth: 170 }} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">Semua status</option>
          <option value="belum">Belum mengisi{word ? ` ${word}` : ''}</option>
          <option value="sudah">Sudah mengisi{word ? ` ${word}` : ''}</option>
        </select>
      </div>

      {tokens.length === 0 ? (
        <div className="list-card text-center py-4">
          Belum ada link. Tekan <strong>Buat link untuk semua responden</strong>. Pastikan data responden sudah diisi di menu{' '}
          <Link href="/admin/responden">Responden</Link>.
        </div>
      ) : (
        <div className="d-flex flex-column gap-2">
          {rows.map((t) => {
            const r = t.respondents;
            return (
              <div key={t.id} className="list-card d-flex flex-wrap align-items-center gap-2">
                <div className="flex-grow-1 min-w-0" style={{ minWidth: 200 }}>
                  <div className="fw-semibold text-truncate">{r.name}</div>
                  <div className="small text-secondary">
                    <span className={`badge-soft role ${r.role} me-1`}>{ROLE_SHORT[r.role]}</span>
                    {r.class_name || r.subject || ''} {r.identifier && <span className="ms-1">({r.identifier})</span>}
                  </div>
                </div>
                <code className="small d-none d-lg-inline">/isi/{t.token}</code>
                {isDone(t) ? (
                  <span className="badge-soft st-terbit" title={t.used_at ? formatDate(t.used_at) : ''}>Sudah mengisi{word ? ` ${word}` : ''}</span>
                ) : (
                  <span className="badge-soft st-draf">Belum</span>
                )}
                <div className="d-flex gap-1">
                  {!isDone(t) && (
                    <>
                      <CopyButton text={url(t)} />
                      <a className={`btn btn-sm btn-outline-secondary ${r.phone ? '' : 'disabled'}`} href={r.phone ? waLink(r.phone, waText(t)) : undefined}
                        target="_blank" rel="noreferrer" title={r.phone ? 'Kirim lewat WhatsApp' : 'Nomor WA belum diisi'} aria-label="Kirim WhatsApp">
                        <i className="bi bi-whatsapp" />
                      </a>
                      <button type="button" className="btn btn-sm btn-outline-secondary" title="Buat link baru" aria-label="Buat link baru" disabled={pending}
                        onClick={() => window.confirm('Buat link baru? Link lama tidak berlaku lagi.') && run(() => regenerateToken(t.id, formId))}>
                        <i className="bi bi-arrow-repeat" />
                      </button>
                    </>
                  )}
                  {isDone(t) && (
                    <button type="button" className="btn btn-sm btn-outline-danger" title="Izinkan isi ulang" aria-label="Izinkan isi ulang" disabled={pending}
                      onClick={() => window.confirm(`Hapus jawaban ${r.name}${word ? ` ${word}` : ''} agar bisa mengisi ulang? Jawaban itu tidak bisa dikembalikan.`) && run(() => allowRefill(t.id, formId))}>
                      <i className="bi bi-arrow-counterclockwise" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {rows.length === 0 && <p className="text-secondary">Tidak ada yang cocok dengan saringan.</p>}
        </div>
      )}
      <Toast msg={msg} onClose={() => setMsg(null)} />
    </>
  );
}
