import type { Brand } from '@/lib/types';
import { BrandMark } from './Brand';
import Credit from '@/components/Credit';

type Props = {
  brand: Brand;
  icon: string;
  tone?: 'info' | 'ok' | 'warn';
  title: string;
  text: string;
  children?: React.ReactNode;
};

export default function StatusCard({ brand, icon, tone = 'info', title, text, children }: Props) {
  const bg = tone === 'ok' ? '#E1F2EA' : tone === 'warn' ? '#FFF4CC' : 'var(--langit-muda)';
  const fg = tone === 'ok' ? 'var(--hijau)' : tone === 'warn' ? '#7A5A00' : 'var(--laut)';
  return (
    <div className="fokus">
      <div className="fokus-top">
        <BrandMark brand={brand} size={38} />
        <svg className="wave" viewBox="0 0 1200 26" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 14 C150 0 300 0 450 12 S750 26 900 12 S1100 2 1200 10 V26 H0Z" fill="#EAF3FD" />
        </svg>
      </div>
      <div className="fokus-body text-center">
        <div className="d-inline-grid rounded-circle mb-3" style={{ width: 76, height: 76, placeItems: 'center', background: bg, color: fg, fontSize: '2.1rem' }}>
          <i className={`bi ${icon}`} />
        </div>
        <h1 className="q-big mb-2">{title}</h1>
        <p className="text-secondary">{text}</p>
        {children}
        <Credit />
      </div>
    </div>
  );
}
