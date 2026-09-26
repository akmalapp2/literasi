'use client';

import { useRef, useState, useTransition } from 'react';
import * as XLSX from 'xlsx';
import { importRespondents, type ImportRow } from '@/actions/respondents';
import Toast, { type ToastMsg } from '@/components/Toast';
import { ROLE_LABEL, usesClass } from '@/lib/text';
import { ROLES, type Role } from '@/lib/types';

const HEAD = ['Nama', 'Nomor Induk (NIT/NIP)', 'Peran', 'Kelas', 'Mapel/Jabatan', 'No WA'];

/** Kenali peran dari teks bebas di Excel. Urutan penting ("Kepala Tata Usaha" = tendik). */
function toRole(v: unknown): Role {
  const s = String(v ?? '').toLowerCase().trim();
  if (s.includes('orang tua') || s.includes('wali') || s === 'ortu') return 'ortu';
  if (s.includes('tata usaha') || s.includes('tendik') || s.includes('tenaga') || s.includes('staf') || s === 'tu') return 'tendik';
  if (s.includes('kepala') || s.includes('kepsek')) return 'kepsek';
  if (s.includes('guru')) return 'guru';
  if (s.includes('alumni')) return 'alumni';
  if (s.includes('umum') || s.includes('masyarakat')) return 'umum';
  return 'siswa';
}
function pick(row: Record<string, unknown>, ...keys: string[]): string {
  const found = Object.keys(row).find((k) => keys.some((x) => k.toLowerCase().replace(/\s+/g, '').includes(x)));
  return found ? String(row[found] ?? '').trim() : '';
}

/** Impor responden dari file Excel/CSV. Kolom: Nama, Nomor Induk, Peran, Kelas, Mapel/Jabatan, No WA. */
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
            identifier: pick(r, 'nomorinduk', 'nit', 'nisn', 'nip', 'nuptk', 'nik', 'identitas'),
            role,
            class_name: usesClass(role) ? pick(r, 'kelas', 'rombel', 'lulus', 'angkatan') || null : null,
            subject: !usesClass(role) ? pick(r, 'mapel', 'jabatan', 'mata', 'pekerjaan', 'instansi') || null : null,
            phone: pick(r, 'wa', 'hp', 'telepon', 'telp') || null,
          };
        })
        .filter((r) => r.name && r.identifier);
      if (!parsed.length) setMsg({ type: 'error', text: 'Tidak ada baris valid. Pastikan ada kolom Nama dan Nomor Induk di baris pertama.' });
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
      ['Andi Pratama', '2024001', 'Siswa', 'XI NKPI 1', '', '081234567890'],
      ['Nur Aisyah, S.Pd.', '198703152010012005', 'Guru', '', 'Bahasa Indonesia', '081298765432'],
      ['Drs. H. Ahmad', '196805121994031008', 'Kepala Sekolah', '', 'Kepala Sekolah', ''],
      ['Rahmat', '7301010101800001', 'Tenaga Kependidikan', '', 'Tata Usaha', ''],
      ['Hj. Sitti', '7301014505750002', 'Orang Tua/Wali', 'XI NKPI 1', '', '081311122233'],
      ['Rina Amalia', '2021045', 'Alumni', '2024', '', ''],
    ]);
    ws['!cols'] = [{ wch: 26 }, { wch: 22 }, { wch: 16 }, { wch: 12 }, { wch: 20 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Responden');
    XLSX.writeFile(wb, 'template-responden.xlsx');
  };

  const summary = rows
    ? ROLES.map((r) => ({ r, n: rows.filter((x) => x.role === r).length }))
        .filter((x) => x.n > 0)
        .map((x) => `${x.n} ${ROLE_LABEL[x.r].toLowerCase()}`)
        .join(', ')
    : '';

  return (
    <>
      <div className="d-inline-flex gap-1">
        <button type="button" className="btn btn-outline-primary" onClick={() => file.current?.click()} disabled={pending}>
          <i className="bi bi-file-earmark-spreadsheet me-1" />Impor Excel
        </button>
        <button type="button" className="btn btn-link px-1" onClick={template} title="Unduh template Excel">Template</button>
        <input ref={file} type="file" className="d-none" accept=".xlsx,.xls,.csv" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      </div>
      {rows && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3" style={{ background: 'rgba(19,33,61,.45)', zIndex: 1080 }}>
          <div className="card border-0 shadow" style={{ maxWidth: 440, width: '100%' }} role="dialog" aria-modal="true" aria-labelledby="impTitle">
            <div className="card-body p-4">
              <h2 id="impTitle" className="h5 fw-bold">Impor {rows.length} responden?</h2>
              <p className="text-secondary mb-2">{summary}.</p>
              <p className="small text-secondary">Data dengan nomor induk yang sudah ada akan diperbarui, bukan digandakan.</p>
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
