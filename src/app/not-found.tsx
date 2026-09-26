import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container py-5 text-center" style={{ maxWidth: 520 }}>
      <i className="bi bi-signpost-split fs-1 text-primary" />
      <h1 className="h4 fw-bold mt-3">Halaman tidak ditemukan</h1>
      <p className="text-secondary">Periksa kembali alamatnya, atau kembali ke beranda.</p>
      <Link href="/" className="btn btn-primary">Ke beranda</Link>
    </div>
  );
}
