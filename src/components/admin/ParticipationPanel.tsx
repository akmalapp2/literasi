'use client';

import { useMemo, useState } from 'react';
import { PERIOD_WORD, periodKey, periodLabel, type RepeatMode } from '@/lib/period';
import { ROLE_LABEL, usesClass } from '@/lib/text';
import { ROLES, type Role } from '@/lib/types';

export type Person = { id: string; name: string; role: Role; class_name: string | null };

type Props = {
  formTitle: string;
  people: Person[];
  /** id responden yang sudah mengisi pada periode sekarang. */
  doneIds: string[];
  repeatMode: RepeatMode;
  /** Link umum (mode kode/terbuka); null untuk mode link pribadi. */
  entryUrl: string | null;
  scheduleText: string;
};

type Group = { key: string; label: string; people: Person[]; done: number };

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    window.prompt('Salin teks ini:', text);
    return false;
  }
}

/** Rekap partisipasi per kelas/peran + salin daftar yang belum mengisi. */
export default function ParticipationPanel({ formTitle, people, doneIds, repeatMode, entryUrl, scheduleText }: Props) {
  const done = useMemo(() => new Set(doneIds), [doneIds]);
  const [copied, setCopied] = useState<string | null>(null);
  const [sortLow, setSortLow] = useState(false);
  const word = PERIOD_WORD[repeatMode];
  const period = repeatMode === 'sekali' ? '' : periodLabel(periodKey(repeatMode));

  const groups = useMemo(() => {
    const out: Group[] = [];
    for (const r of ROLES) {
      const inRole = people.filter((p) => p.role === r);
      if (!inRole.length) continue;
      if (usesClass(r) && r !== 'alumni') {
        const byClass = new Map<string, Person[]>();
        for (const p of inRole) {
          const k = p.class_name?.trim() || '(tanpa kelas)';
          byClass.set(k, [...(byClass.get(k) ?? []), p]);
        }
        const keys = [...byClass.keys()].sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
        for (const k of keys) {
          const list = byClass.get(k)!;
          out.push({ key: `${r}:${k}`, label: r === 'siswa' ? `Kelas ${k}` : `${ROLE_LABEL[r]} kelas ${k}`, people: list, done: list.filter((p) => done.has(p.id)).length });
        }
      } else {
        out.push({ key: r, label: ROLE_LABEL[r], people: inRole, done: inRole.filter((p) => done.has(p.id)).length });
      }
    }
    return out;
  }, [people, done]);

  const shown = sortLow ? [...groups].sort((a, b) => a.done / a.people.length - b.done / b.people.length) : groups;
  const total = people.length;
  const totalDone = people.filter((p) => done.has(p.id)).length;
  const pct = (d: number, t: number) => (t ? Math.round((d / t) * 100) : 0);

  const message = (gs: Group[]) => {
    const lines: string[] = [`*Pengingat pengisian: ${formTitle}*`];
    if (period) lines.push(period);
    let count = 0;
    for (const g of gs) {
      const pending = g.people.filter((p) => !done.has(p.id)).sort((a, b) => a.name.localeCompare(b.name, 'id'));
      if (!pending.length) continue;
      count += pending.length;
      lines.push('', `*${g.label}* (${pending.length} orang belum mengisi${word ? ` ${word}` : ''}):`);
      pending.forEach((p, i) => lines.push(`${i + 1}. ${p.name}`));
    }
    if (!count) return null;
    lines.push('');
    if (entryUrl) lines.push(`Silakan isi di: ${entryUrl}`);
    else lines.push('Silakan isi lewat link/QR pribadi masing-masing.');
    if (scheduleText) lines.push(`Jadwal: ${scheduleText}.`);
    lines.push('Terima kasih.');
    return lines.join('\n');
  };

  const doCopy = async (key: string, gs: Group[]) => {
    const text = message(gs);
    if (!text) {
      setCopied(`${key}:kosong`);
    } else {
      await copy(text);
      setCopied(key);
    }
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="card border-0 shadow-sm mb-3"><div className="card-body p-3 p-md-4">
      <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
        <h2 className="h6 fw-bold mb-0">Rekap partisipasi{word ? ` ${word}` : ''}</h2>
        <div className="ms-auto d-flex flex-wrap gap-2">
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setSortLow((v) => !v)} aria-pressed={sortLow}>
            <i className="bi bi-sort-up me-1" />{sortLow ? 'Urut kelompok' : 'Terendah dulu'}
          </button>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => doCopy('semua', groups)} disabled={totalDone === total}>
            <i className={`bi ${copied === 'semua' ? 'bi-check2' : 'bi-clipboard'} me-1`} />
            {copied === 'semua' ? 'Tersalin' : 'Salin daftar yang belum mengisi'}
          </button>
        </div>
      </div>
      <div className="small text-secondary mb-3">
        {period ? `${period}. ` : ''}{totalDone} dari {total} sudah mengisi ({pct(totalDone, total)}%).
        Tombol salin menghasilkan teks siap tempel ke grup WhatsApp.
      </div>

      <div className="table-responsive">
        <table className="table align-middle mb-0">
          <thead>
            <tr>
              <th>Kelompok</th>
              <th className="text-end">Jumlah</th>
              <th className="text-end">Sudah</th>
              <th className="text-end">Belum</th>
              <th style={{ minWidth: 140 }}>Persentase</th>
              <th className="text-end">Salin</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((g) => {
              const p = pct(g.done, g.people.length);
              const belum = g.people.length - g.done;
              return (
                <tr key={g.key}>
                  <td className="fw-semibold">{g.label}</td>
                  <td className="text-end">{g.people.length}</td>
                  <td className="text-end">{g.done}</td>
                  <td className={`text-end ${belum ? 'text-danger fw-semibold' : ''}`}>{belum}</td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <div className="progress flex-grow-1" role="progressbar" aria-label={`${g.label} ${p}%`} aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}>
                        <div className="progress-bar" style={{ width: `${p}%` }} />
                      </div>
                      <span className="small fw-semibold" style={{ width: 38, textAlign: 'right' }}>{p}%</span>
                    </div>
                  </td>
                  <td className="text-end">
                    <button type="button" className="btn btn-sm btn-outline-secondary icon-btn" disabled={!belum}
                      title={belum ? `Salin daftar ${g.label} yang belum mengisi` : 'Semua sudah mengisi'} aria-label={`Salin daftar ${g.label}`}
                      onClick={() => doCopy(g.key, [g])}>
                      <i className={`bi ${copied === g.key ? 'bi-check2' : 'bi-clipboard'}`} />
                    </button>
                  </td>
                </tr>
              );
            })}
            <tr className="table-light fw-semibold">
              <td>Total</td>
              <td className="text-end">{total}</td>
              <td className="text-end">{totalDone}</td>
              <td className="text-end">{total - totalDone}</td>
              <td colSpan={2}>{pct(totalDone, total)}%</td>
            </tr>
          </tbody>
        </table>
      </div>
      {copied?.endsWith(':kosong') && <div className="small text-success mt-2">Semua di kelompok ini sudah mengisi.</div>}
    </div></div>
  );
}
