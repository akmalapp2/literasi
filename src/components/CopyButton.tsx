'use client';

import { useState } from 'react';

export default function CopyButton({ text, label, className = 'btn btn-sm btn-outline-secondary' }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      title="Salin"
      aria-label={label ?? 'Salin'}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          window.prompt('Salin teks ini:', text);
        }
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      <i className={`bi ${done ? 'bi-check2' : 'bi-clipboard'}`} />
      {label ? <span className="ms-1">{done ? 'Tersalin' : label}</span> : null}
    </button>
  );
}
