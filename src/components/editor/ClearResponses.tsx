'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { clearResponses } from '@/actions/forms';

/** Zona berbahaya: kosongkan semua jawaban tanpa menghapus angket. */
export default function ClearResponses({ formId, count }: { formId: string; count: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = () => {
    const typed = window.prompt(
      `Semua ${count} jawaban akan dihapus permanen. Pertanyaan dan link responden tetap ada, dan semua responden bisa mengisi ulang.\n\nKetik HAPUS untuk melanjutkan:`,
    );
    if (typed === null) return;
    if (typed.trim().toUpperCase() !== 'HAPUS') {
      setMsg({ ok: false, text: 'Dibatalkan. Ketik HAPUS dengan benar untuk menghapus.' });
      return;
    }
    start(async () => {
      const r = await clearResponses(formId);
      setMsg(r.ok ? { ok: true, text: r.message ?? 'Jawaban dihapus.' } : { ok: false, text: r.error });
      if (r.ok) router.refresh();
    });
  };

  return (
    <div className="card border-danger-subtle" style={{ borderRadius: 14 }}>
      <div className="card-body p-3 p-md-4">
        <h2 className="h6 fw-bold text-danger mb-1"><i className="bi bi-exclamation-octagon me-1" />Zona berbahaya</h2>
        <p className="small text-secondary mb-3">
          Kosongkan semua jawaban, misalnya setelah uji coba. Pertanyaan, pengaturan, dan link responden tidak ikut terhapus.
          Unduh jawaban (CSV) terlebih dahulu jika masih dibutuhkan.
        </p>
        <div className="d-flex flex-wrap align-items-center gap-2">
          <button type="button" className="btn btn-outline-danger" onClick={run} disabled={pending || count === 0}>
            {pending ? <span className="spinner-border spinner-border-sm me-1" /> : <i className="bi bi-trash me-1" />}
            Hapus semua jawaban ({count})
          </button>
          <a className="btn btn-link" href={`/admin/angket/${formId}/unduh`}><i className="bi bi-download me-1" />Unduh CSV dulu</a>
        </div>
        {count === 0 && !msg && <div className="small text-secondary mt-2">Belum ada jawaban.</div>}
        {msg && <div className={`alert ${msg.ok ? 'alert-success' : 'alert-danger'} py-2 small mt-3 mb-0`} role="status">{msg.text}</div>}
      </div>
    </div>
  );
}
