'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { deleteResponse } from '@/actions/answers';

export default function DeleteResponseButton({ responseId, formId, label }: { responseId: string; formId: string; label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-danger"
      disabled={pending}
      title="Hapus jawaban ini"
      onClick={() => {
        if (!window.confirm(`Hapus jawaban ${label}? Jawaban lain milik responden ini tidak ikut terhapus. Tindakan ini tidak bisa dibatalkan.`)) return;
        start(async () => {
          const r = await deleteResponse(responseId, formId);
          if (!r.ok) window.alert(r.error);
          router.refresh();
        });
      }}
    >
      {pending ? <span className="spinner-border spinner-border-sm" /> : <i className="bi bi-trash" />}
      <span className="d-none d-sm-inline ms-1">Hapus</span>
    </button>
  );
}
