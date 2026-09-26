'use client';

export default function PrintButton() {
  return (
    <button type="button" className="btn btn-primary" onClick={() => window.print()}>
      <i className="bi bi-printer me-1" />Cetak
    </button>
  );
}
