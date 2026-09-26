import { CREATOR } from '@/lib/text';

/** Kredit hak cipta pembuat aplikasi (footer). */
export default function Credit({ light = false, className = '' }: { light?: boolean; className?: string }) {
  return (
    <p className={`credit ${light ? 'light' : ''} ${className}`}>
      Hak cipta © {new Date().getFullYear()} {CREATOR}
    </p>
  );
}
