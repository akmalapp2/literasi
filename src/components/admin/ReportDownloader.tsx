'use client';

import { useEffect, useMemo, useState } from 'react';
import { CREATOR, ROLE_LABEL } from '@/lib/text';
import { formatDateId } from '@/lib/answers';
import { cellText, filterLabel, roleCounts, summarize, witaDateTime, type ReportData } from '@/lib/report';
import type { Role } from '@/lib/types';

type Props = { formId: string; targets: Role[] };

/** Teks aman untuk font standar PDF (Latin-1). */
const pdfSafe = (s: string) =>
  s.replace(/[–—]/g, '-').replace(/…/g, '...').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[^\x00-\xFF]/g, '?');

const slugPart = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function toDataUrl(src: string): Promise<string | null> {
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    if (!blob.type.includes('png') && !blob.type.includes('jpeg') && !blob.type.includes('jpg')) return null;
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(typeof r.result === 'string' ? r.result : null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export default function ReportDownloader({ formId, targets }: Props) {
  const [mode, setMode] = useState<'semua' | 'tanggal' | 'rentang'>('semua');
  const [day, setDay] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [peran, setPeran] = useState<Role | ''>('');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'pdf' | 'xlsx' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => {
    if (mode === 'tanggal' && day) return { from: day, to: day };
    if (mode === 'rentang') return { from: from || null, to: to || null };
    return { from: null, to: null };
  }, [mode, day, from, to]);

  useEffect(() => {
    const qp = new URLSearchParams();
    if (range.from) qp.set('from', range.from);
    if (range.to) qp.set('to', range.to);
    if (peran) qp.set('peran', peran);
    let cancel = false;
    setLoading(true);
    setError(null);
    fetch(`/admin/angket/${formId}/laporan/data?${qp.toString()}`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? 'Gagal memuat data.');
        return r.json() as Promise<ReportData>;
      })
      .then((d) => {
        if (cancel) return;
        setData(d);
        if (mode === 'tanggal' && !day && d.dates[0]) setDay(d.dates[0].date);
      })
      .catch((e: Error) => !cancel && setError(e.message))
      .finally(() => !cancel && setLoading(false));
    return () => {
      cancel = true;
    };
  }, [formId, range, peran, mode, day]);

  const label = filterLabel(range.from, range.to, peran || null);
  const fileBase = data
    ? `hasil-${data.form.slug}-${range.from && range.to && range.from === range.to ? range.from : range.from || range.to ? `${range.from ?? 'awal'}_${range.to ?? 'akhir'}` : 'semua'}${peran ? '-' + peran : ''}`
    : 'hasil';

  /* ---------------- Excel ---------------- */
  const downloadExcel = async () => {
    if (!data) return;
    setBusy('xlsx');
    try {
      const XLSX = await import('xlsx');
      const sum = summarize(data.questions, data.rows);
      const wb = XLSX.utils.book_new();

      const info = [
        [data.brand.appName],
        [data.brand.schoolName],
        [],
        ['Judul', data.form.title],
        ['Saringan', label],
        ['Jumlah responden', data.rows.length],
        ...roleCounts(data.rows).map((r) => [`  ${ROLE_LABEL[r.role]}`, r.n]),
        ['Diunduh', witaDateTime(new Date().toISOString()) + ' WITA'],
        [],
        [`Hak cipta © ${new Date().getFullYear()} ${CREATOR}`],
      ];
      const wsInfo = XLSX.utils.aoa_to_sheet(info);
      wsInfo['!cols'] = [{ wch: 22 }, { wch: 60 }];
      XLSX.utils.book_append_sheet(wb, wsInfo, 'Info');

      const rekap: (string | number)[][] = [['No', 'Pertanyaan', 'Jawaban', 'Jumlah', 'Persen (%)']];
      sum.forEach((s, i) => {
        const title = s.q.title.replaceAll('{kamu}', 'Anda').replaceAll('{tugas}', 'kegiatan');
        if (!s.lines.length) rekap.push([i + 1, title, s.note ?? `${s.answered} jawaban`, s.answered, '']);
        s.lines.forEach((l, k) => rekap.push([k === 0 ? i + 1 : '', k === 0 ? title : '', l.label, l.n, s.q.type === 'range' ? '' : l.pct]));
        (s.others ?? []).forEach((o) => rekap.push(['', '', `  Lainnya: ${o.label}`, o.n, o.pct]));
        rekap.push([]);
      });
      const wsRekap = XLSX.utils.aoa_to_sheet(rekap);
      wsRekap['!cols'] = [{ wch: 5 }, { wch: 50 }, { wch: 40 }, { wch: 10 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsRekap, 'Rekap');

      const head = ['No', 'Waktu kirim (WITA)', 'Nama', 'NIT/NIP', 'Peran', 'Kelas/keterangan', ...data.questions.map((q) => q.title)];
      const body = data.rows.map((r, i) => [
        i + 1,
        witaDateTime(r.submitted_at),
        r.name ?? '(anonim)',
        r.identifier ?? '',
        r.role ? ROLE_LABEL[r.role] : '',
        r.class_name ?? '',
        ...data.questions.map((q) => cellText(q, r.answers[q.id])),
      ]);
      const wsData = XLSX.utils.aoa_to_sheet([head, ...body]);
      wsData['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 26 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, ...data.questions.map(() => ({ wch: 28 }))];
      XLSX.utils.book_append_sheet(wb, wsData, 'Jawaban');

      XLSX.writeFile(wb, `${slugPart(fileBase)}.xlsx`);
    } catch {
      setError('Gagal membuat file Excel.');
    } finally {
      setBusy(null);
    }
  };

  /* ---------------- PDF ---------------- */
  const downloadPdf = async () => {
    if (!data) return;
    setBusy('pdf');
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const M = 14;
      const lastY = () => (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 40;
      const NAVY: [number, number, number] = [11, 43, 107];

      // Kop
      const logo = await toDataUrl(data.brand.logo);
      if (logo) doc.addImage(logo, 'PNG', M, 10, 18, 17);
      const tx = logo ? M + 22 : M;
      doc.setTextColor(...NAVY);
      doc.setFont('helvetica', 'bold').setFontSize(14).text(pdfSafe(data.brand.appName), tx, 16);
      doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(90, 102, 121).text(pdfSafe(data.brand.schoolName), tx, 22);
      doc.setDrawColor(245, 196, 0).setLineWidth(1).line(M, 30, W - M, 30);

      doc.setTextColor(19, 33, 61).setFont('helvetica', 'bold').setFontSize(13);
      const titleLines = doc.splitTextToSize(pdfSafe(`Hasil: ${data.form.title}`), W - 2 * M);
      doc.text(titleLines, M, 38);
      let y = 38 + titleLines.length * 6;
      doc.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(90, 102, 121);
      const rc = roleCounts(data.rows).map((r) => `${ROLE_LABEL[r.role]} ${r.n}`).join(', ');
      doc.text(pdfSafe(`Saringan: ${label}`), M, y);
      doc.text(pdfSafe(`Jumlah responden: ${data.rows.length}${rc ? ` (${rc})` : ''}`), M, y + 5);
      doc.text(pdfSafe(`Diunduh: ${witaDateTime(new Date().toISOString())} WITA`), M, y + 10);
      y += 16;

      // Rekap per pertanyaan
      const sum = summarize(data.questions, data.rows);
      sum.forEach((s, i) => {
        const title = pdfSafe(`${i + 1}. ${s.q.title.replaceAll('{kamu}', 'Anda').replaceAll('{tugas}', 'kegiatan')}`);
        const body: (string | number)[][] = s.lines.map((l) => [pdfSafe(l.label), l.n, s.q.type === 'range' ? '' : `${l.pct}%`]);
        (s.others ?? []).slice(0, 10).forEach((o) => body.push([pdfSafe(`   Lainnya: ${o.label}`), o.n, `${o.pct}%`]));
        if (!body.length) body.push([pdfSafe(s.note ?? `${s.answered} jawaban`), s.answered, '']);
        autoTable(doc, {
          startY: y,
          margin: { left: M, right: M },
          head: [[{ content: title, colSpan: 3, styles: { halign: 'left' } }], ['Jawaban', 'Jumlah', 'Persen']],
          body,
          theme: 'grid',
          styles: { fontSize: 9, cellPadding: 1.8, textColor: [19, 33, 61] },
          headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
          columnStyles: { 1: { halign: 'center', cellWidth: 22 }, 2: { halign: 'center', cellWidth: 22 } },
          didParseCell: (h) => {
            if (h.section === 'head' && h.row.index === 1) {
              h.cell.styles.fillColor = [234, 243, 253];
              h.cell.styles.textColor = [11, 43, 107];
            }
          },
        });
        y = lastY() + 3;
        const note = s.q.type === 'long' ? '' : s.note;
        if (note) {
          doc.setFontSize(8).setTextColor(107, 122, 144).text(pdfSafe(note), M, y + 2);
          y += 5;
        }
        y += 4;
      });

      // Daftar responden
      autoTable(doc, {
        startY: y + 2,
        margin: { left: M, right: M },
        head: [['No', 'Nama', 'NIT/NIP', 'Peran', 'Kelas', 'Waktu kirim (WITA)']],
        body: data.rows.map((r, i) => [
          i + 1,
          pdfSafe(r.name ?? '(anonim)'),
          r.identifier ?? '',
          r.role ? ROLE_LABEL[r.role] : '',
          pdfSafe(r.class_name ?? ''),
          witaDateTime(r.submitted_at),
        ]),
        theme: 'striped',
        styles: { fontSize: 8.5, cellPadding: 1.6 },
        headStyles: { fillColor: NAVY, textColor: 255 },
        columnStyles: { 0: { cellWidth: 10, halign: 'center' } },
      });

      // Nomor halaman + kredit
      const pages = doc.getNumberOfPages();
      for (let p = 1; p <= pages; p++) {
        doc.setPage(p);
        const H = doc.internal.pageSize.getHeight();
        doc.setFontSize(8).setTextColor(107, 122, 144);
        doc.text(pdfSafe(`Hak cipta © ${new Date().getFullYear()} ${CREATOR}`), M, H - 8);
        doc.text(`Halaman ${p} dari ${pages}`, W - M, H - 8, { align: 'right' });
      }

      doc.save(`${slugPart(fileBase)}.pdf`);
    } catch {
      setError('Gagal membuat file PDF.');
    } finally {
      setBusy(null);
    }
  };

  const n = data?.rows.length ?? 0;

  return (
    <div className="d-flex flex-column gap-3">
      <div className="card border-0 shadow-sm"><div className="card-body p-3 p-md-4">
        <h2 className="h6 fw-bold mb-3">1. Tanggal pengisian</h2>
        <div className="d-flex flex-wrap gap-3 mb-3">
          {([['semua', 'Semua tanggal'], ['tanggal', 'Satu tanggal'], ['rentang', 'Rentang tanggal']] as const).map(([v, l]) => (
            <div className="form-check" key={v}>
              <input className="form-check-input" type="radio" name="mode" id={`m-${v}`} checked={mode === v} onChange={() => setMode(v)} />
              <label className="form-check-label" htmlFor={`m-${v}`}>{l}</label>
            </div>
          ))}
        </div>
        {mode === 'tanggal' && (
          <div style={{ maxWidth: 360 }}>
            <label className="form-label small fw-semibold" htmlFor="day">Pilih tanggal</label>
            {data && data.dates.length ? (
              <select id="day" className="form-select" value={day} onChange={(e) => setDay(e.target.value)}>
                {data.dates.map((d) => <option key={d.date} value={d.date}>{formatDateId(d.date)} ({d.n} jawaban)</option>)}
              </select>
            ) : (
              <input id="day" type="date" className="form-control" value={day} onChange={(e) => setDay(e.target.value)} />
            )}
            <div className="form-text">Hanya tanggal yang ada jawabannya yang ditampilkan.</div>
          </div>
        )}
        {mode === 'rentang' && (
          <div className="row g-3" style={{ maxWidth: 520 }}>
            <div className="col-6">
              <label className="form-label small fw-semibold" htmlFor="from">Dari tanggal</label>
              <input id="from" type="date" className="form-control" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="col-6">
              <label className="form-label small fw-semibold" htmlFor="to">Sampai tanggal</label>
              <input id="to" type="date" className="form-control" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        )}

        <h2 className="h6 fw-bold mt-4 mb-2">2. Peran</h2>
        <select className="form-select" style={{ maxWidth: 360 }} value={peran} aria-label="Peran" onChange={(e) => setPeran(e.target.value as Role | '')}>
          <option value="">Semua peran</option>
          {targets.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
      </div></div>

      <div className="card border-0 shadow-sm"><div className="card-body p-3 p-md-4">
        <h2 className="h6 fw-bold mb-2">3. Unduh</h2>
        <p className="mb-3">
          {loading ? <span className="text-secondary"><span className="spinner-border spinner-border-sm me-2" />Menghitung…</span>
            : <><strong>{n}</strong> jawaban sesuai saringan <span className="text-secondary">({label})</span>.</>}
        </p>
        {data && !loading && n > 0 && (
          <div className="small text-secondary mb-3">
            {roleCounts(data.rows).map((r) => `${ROLE_LABEL[r.role]}: ${r.n}`).join(', ')}
          </div>
        )}
        {error && <div className="alert alert-danger py-2 small">{error}</div>}
        <div className="d-flex flex-wrap gap-2">
          <button type="button" className="btn btn-success" disabled={loading || !n || !!busy} onClick={downloadExcel}>
            {busy === 'xlsx' ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-file-earmark-excel me-1" />}
            Unduh Excel
          </button>
          <button type="button" className="btn btn-danger" disabled={loading || !n || !!busy} onClick={downloadPdf}>
            {busy === 'pdf' ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-file-earmark-pdf me-1" />}
            Unduh PDF
          </button>
        </div>
        <ul className="small text-secondary mt-3 mb-0 ps-3">
          <li><strong>Excel</strong>: lembar Info, Rekap per pertanyaan, dan Jawaban lengkap tiap responden.</li>
          <li><strong>PDF</strong>: kop sekolah, rekap per pertanyaan (jumlah &amp; persen), dan daftar responden. Siap dicetak.</li>
        </ul>
      </div></div>
    </div>
  );
}
