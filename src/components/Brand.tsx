import type { Brand } from '@/lib/types';

/** Logo + nama aplikasi (boleh dua baris, tidak terpotong) + nama sekolah. */
export function BrandMark({ brand, size = 40, className = '' }: { brand: Brand; size?: number; className?: string }) {
  return (
    <div className={`d-flex align-items-center gap-2 min-w-0 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="logo" src={brand.logo} width={size} height={Math.round(size * 0.93)} alt={`Logo ${brand.schoolName}`} />
      <div className="min-w-0">
        <div className="brand-name">{brand.appName}</div>
        <div className="brand-sub">{brand.schoolName}</div>
      </div>
    </div>
  );
}

export function Logo({ brand, size = 32, alt = '' }: { brand: Brand; size?: number; alt?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="logo" src={brand.logo} width={size} height={Math.round(size * 0.93)} alt={alt} />;
}
