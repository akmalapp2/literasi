'use client';

import { useEffect, useRef } from 'react';

export type ToastMsg = { type: 'ok' | 'error'; text: string } | null;

export default function Toast({ msg, onClose }: { msg: ToastMsg; onClose: () => void }) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => close.current(), msg.type === 'ok' ? 3000 : 7000);
    return () => clearTimeout(t);
  }, [msg]);
  if (!msg) return null;
  return (
    <div className={`toast-float alert ${msg.type === 'ok' ? 'alert-success' : 'alert-danger'} shadow d-flex align-items-start gap-2 mb-0`} role="status">
      <i className={`bi ${msg.type === 'ok' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} mt-1`} />
      <div className="flex-grow-1">{msg.text}</div>
      <button type="button" className="btn-close" aria-label="Tutup" onClick={onClose} />
    </div>
  );
}
