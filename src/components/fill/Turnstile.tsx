'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

type TurnstileApi = {
  render: (el: HTMLElement, opts: { sitekey: string; callback: (t: string) => void; 'expired-callback'?: () => void; language?: string }) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window { turnstile?: TurnstileApi }
}

export default function Turnstile({ siteKey, onToken }: { siteKey: string; onToken: (t: string | null) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(typeof window !== 'undefined' && !!window.turnstile);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!ready || !box.current || !window.turnstile) return;
    const id = window.turnstile.render(box.current, {
      sitekey: siteKey,
      language: 'id',
      callback: (t) => cb.current(t),
      'expired-callback': () => cb.current(null),
    });
    return () => window.turnstile?.remove(id);
  }, [ready, siteKey]);

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={() => setReady(true)} />
      <div ref={box} className="my-2" />
    </>
  );
}
