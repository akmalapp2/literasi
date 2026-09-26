'use client';

import { useRef, useState, useTransition } from 'react';
import * as XLSX from 'xlsx';
import { importRespondents, type ImportRow } from '@/actions/respondents';
import Toast, { type ToastMsg } from '@/components/Toast';
import type { Role } from '@/lib/types';

const HEAD = ['Nama', 'NISN/NIP', 'Peran', 'Kelas', 'Mapel/Jabatan', 'No WA'];

function toRole(v: unknown): Role {
  const s = String(v ?? '').toLowerCase();
  if (s.includes('kepala') || s.includes('kepsek')) return 'kepsek';
  if (s.includes('guru')) return 'guru';
  return 'siswa';
}
function pick(row: Record<string, unknown>, ...keys: string[]): string {
  const found = Object.keys(row).find((k) => keys.some((x) => k.toLowerCase().replace(/\s+/g, '').includes(x)));
  return found ? String(row[found] ?? '').trim() : '';
}

/** Impor responden dari file Excel/CSV. Kolom: Nama, NISN/NIP, Peran, Kelas, Mapel/Jabatan, No WA. */
export default function ImportExcel() {
  const file = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [msg, setMsg] = useState<ToastMsg>(null);
  const [pending, start] = useTransition();

  const onFile = async (f: File) => {
    try {
      const wb = XLSX.read(await f.arrayBuffer());
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
      const parsed: ImportRow[] = json
        .map((r) => {
          const role = toRole(pick(r, 'peran', 'role', 'status'));
          return {
            name: pick(r, 'nama'),
            identifier: pick(r, 'nisn', 'nip', 'nuptk', 'nomorinduk', 'identitas'),
            role,
            class_name: role === 'siswa' ? pick(r, 'kelas', 'rombel') || null : null,
            subject: role !== 'siswa' ? pick(r, 'mapel', 'jabatan', 'mata') || null : null,
            phone: pick(r, 'wa', 'hp', 'telepon', 'telp') || null,
          };
        })
        .filter((r) => r.name && r.identifier);
      if (!parsed.length) setMsg({ type: 'error', text: 'Tidak ada baris valid. Pastikan ada kolom Nama dan NISN/NIP di baris pertama.' });
      setRows(parsed.length ? parsed : null);
    } catch {
      setMsg({ type: 'error', text: 'File tidak bisa dibaca. Gunakan .xlsx, .xls, atau .csv.' });
    } finally {
      if (file.current) file.current.value = '';
    }
  };

  const template = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      HEAD,
      ['Andi Pratama', '0081234567', 'Siswa', 'XI NKPI 1', '', '081234567890'],
      ['Nur Aisyah, S.Pd.', '198703152010012005', 'Guru', '', 'Bahasa Indonesia', '081298765432'],
      ['Drs. H. Ahmad', '196805121994031008', 'Kepala Sekolah', '', 'Kepala Sekolah', ''],
    ]);
    ws['!cols'] = [{ wch: 26 }, { wch: 22 }, { wch: 16 }, { wch: 12 }, { wch: 20 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Responden');
    XLSX.writeFile(wb, 'template-responden.xlsx');
  };

  const counts = rows
    ? {
        kepsek: rows.filter((x) => x.role === 'kepsek').length,
        guru: rows.filter((x) => x.role === 'guru').length,
        siswa: rows.filter((x) => x.role === 'siswa').length,
      }
    : null;

  return (
    <>
      <div className="d-inline-flex gap-1">
        <button type="button" className="btn btn-outline-primary" onClick={() => file.current?.click()} disabled={pending}>
          <i className="bi bi-file-earmark-spreadsheet me-1" />Impor Excel
        </button>
        <button type="button" className="btn btn-link px-1" onClick={template} title="Unduh template Excel">Template</button>
        <input ref={file} type="file" className="d-none" accept=".xlsx,.xls,.csv" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </div>
      {rows && counts && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3" style={{ background: 'rgba(19,33,61,.45)', zIndex: 1080 }}>
          <div className="card border-0 shadow" style={{ maxWidth: 440, width: '100%' }} role="dialog" aria-modal="true" aria-labelledby="impTitle">
            <div className="card-body p-4">
              <h2 id="impTitle" className="h5 fw-bold">Impor {rows.length} responden?</h2>
              <p className="text-secondary mb-2">{counts.kepsek} kepala sekolah, {counts.guru} guru, {counts.siswa} siswa.</p>
              <p className="small text-secondary">Data dengan NISN/NIP yang sudah ada akan diperbarui, bukan digandakan.</p>
              <div className="d-flex gap-2 justify-content-end">
                <button type="button" className="btn btn-light" onClick={() => setRows(null)} disabled={pending}>Batal</button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await importRespondents(rows);
                      setMsg(r.ok ? { type: 'ok', text: r.message ?? 'Selesai.' } : { type: 'error', text: r.error });
                      if (r.ok) setRows(null);
                    })
                  }
                >
                  {pending && <span className="spinner-border spinner-border-sm me-1" />}Impor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <Toast msg={msg} onClose={() => setMsg(null)} />
    </>
  );
}
