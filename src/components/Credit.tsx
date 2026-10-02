/** Kredit hak cipta pembuat aplikasi (footer). Teks pembuat diambil dari pengaturan (brand.creator). */
export default function Credit({ creator, light = false, className = '' }: { creator: string; light?: boolean; className?: string }) {
  if (!creator.trim()) return null;
  return (
    <p className={`credit ${light ? 'light' : ''} ${className}`}>
      Hak cipta © {new Date().getFullYear()} {creator}
    </p>
  );
}
