import type { Brand } from '@/lib/types';

/** Kepala halaman masuk: logo, judul, nama sekolah, penanda langkah. */
export default function EntryHero({ brand, title, step, small = false }: { brand: Brand; title: string; step?: number; small?: boolean }) {
  const size = small ? 64 : 96;
  return (
    <div className="entry-hero">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="logo" src={brand.logo} width={size} height={Math.round(size * 0.93)} alt={`Logo ${brand.schoolName}`} />
      <h1>{title}</h1>
      {brand.schoolLine && <div className="school">{brand.schoolLine}</div>}
      {step !== undefined && (
        <div className="stepper" aria-label={`Langkah ${step + 1} dari 3`}>
          {[0, 1, 2].map((i) => <span key={i} className={i <= step ? 'on' : ''} />)}
        </div>
      )}
      <svg className="wave" viewBox="0 0 1200 26" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 14 C150 0 300 0 450 12 S750 26 900 12 S1100 2 1200 10 V26 H0Z" fill="#EAF3FD" />
      </svg>
    </div>
  );
}
