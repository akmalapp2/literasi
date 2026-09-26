'use client';

import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { endLabel, formatDateId, startLabel } from '@/lib/answers';
import { ROLE_SHORT, TYPE_LABEL, neutral } from '@/lib/text';
import type { QSettings, QType, Role } from '@/lib/types';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);
ChartJS.defaults.font.family = 'var(--font-jakarta), system-ui, sans-serif';
ChartJS.defaults.color = '#4a5568';

export type QResult = {
  id: string;
  type: QType;
  title: string;
  roles: Role[];
  options: string[];
  settings?: QSettings | null;
  answered: number;
  counts: { label: string; n: number }[];
  latest: string[];
  range?: { n: number; avg_span: number; total_span: number; min_start: number; max_end: number } | null;
};

const PALETTE = ['#0B2B6B', '#1D4696', '#7FBAF5', '#F5C400', '#C4121A', '#1F8A5B', '#8a9bbd', '#E88A1A'];
const nf = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
const pct = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);

/** Opsi baku + satu kelompok "Lainnya" (isian bebas dikumpulkan jadi satu). */
function series(q: QResult) {
  const map = new Map(q.counts.map((c) => [c.label, c.n]));
  const extra = q.counts.filter((c) => !q.options.includes(c.label));
  const labels = [...q.options];
  const data = q.options.map((o) => map.get(o) ?? 0);
  if (extra.length || q.settings?.allow_other) {
    labels.push('Lainnya');
    data.push(extra.reduce((a, c) => a + c.n, 0));
  }
  return { labels, data, extra };
}

function OtherList({ extra, hideText }: { extra: { label: string; n: number }[]; hideText: boolean }) {
  if (!extra.length) return null;
  if (hideText) return <p className="small text-secondary mt-3 mb-0"><i className="bi bi-eye-slash me-1" />Isian &quot;Lainnya&quot; tidak ditampilkan untuk umum.</p>;
  return (
    <div className="mt-3">
      <div className="small fw-semibold mb-1">Jawaban &quot;Lainnya&quot;</div>
      <ul className="list-group list-group-flush small">
        {extra.slice(0, 10).map((c) => (
          <li key={c.label} className="list-group-item d-flex justify-content-between px-0 py-1">
            <span className="text-break me-2">{c.label}</span>
            <span className="fw-semibold">{c.n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Tanggal dikelompokkan per hari; jika terlalu banyak, per bulan. */
function dateSeries(q: QResult) {
  const valid = q.counts.filter((c) => /^\d{4}-\d{2}-\d{2}$/.test(c.label)).sort((a, b) => a.label.localeCompare(b.label));
  if (valid.length <= 20) return { labels: valid.map((c) => formatDateId(c.label)), data: valid.map((c) => c.n), valid };
  const months = new Map<string, number>();
  for (const c of valid) months.set(c.label.slice(0, 7), (months.get(c.label.slice(0, 7)) ?? 0) + c.n);
  const keys = Array.from(months.keys()).sort();
  const fmt = new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  return { labels: keys.map((k) => fmt.format(new Date(k + '-01T00:00:00Z'))), data: keys.map((k) => months.get(k) ?? 0), valid };
}

export default function ResultsCharts({ questions, hideText }: { questions: QResult[]; hideText: boolean }) {
  if (!questions.length) return <p className="text-secondary">Angket ini belum punya pertanyaan.</p>;

  return (
    <div className="row g-3">
      {questions.map((q, i) => {
        const wide = q.type === 'long';
        let body: React.ReactNode;
        let sub = `${q.answered} jawaban`;

        if (q.answered === 0) {
          body = <p className="text-secondary mb-0">Belum ada jawaban.</p>;
        } else if (q.type === 'radio' || q.type === 'dropdown') {
          const s = series(q);
          body = (
            <>
              <div className="chart-box">
                <Doughnut
                  data={{ labels: s.labels, datasets: [{ data: s.data, backgroundColor: PALETTE, borderColor: '#fff', borderWidth: 2 }] }}
                  options={{
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'bottom', labels: { boxWidth: 12 } },
                      tooltip: { callbacks: { label: (c) => { const v = Number(c.parsed ?? 0); return ` ${c.label}: ${v} (${pct(v, q.answered)}%)`; } } },
                    },
                  }}
                />
              </div>
              <OtherList extra={s.extra} hideText={hideText} />
            </>
          );
        } else if (q.type === 'checkbox') {
          const s = series(q);
          body = (
            <>
              <div className="chart-box" style={{ height: Math.max(200, s.labels.length * 44) }}>
                <Bar
                  data={{ labels: s.labels, datasets: [{ data: s.data, backgroundColor: '#1D4696', borderRadius: 6 }] }}
                  options={{
                    indexAxis: 'y',
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: { callbacks: { label: (c) => { const x = c.parsed.x ?? 0; return ` ${x} orang (${pct(x, q.answered)}%)`; } } },
                    },
                    scales: { x: { grid: { color: '#EEF2F7' }, ticks: { precision: 0 } }, y: { grid: { display: false } } },
                  }}
                />
              </div>
              <OtherList extra={s.extra} hideText={hideText} />
            </>
          );
        } else if (q.type === 'date') {
          const s = dateSeries(q);
          sub = `${q.answered} jawaban, ${s.valid.length > 20 ? 'per bulan' : 'per tanggal'}`;
          body = (
            <>
              <div className="chart-box">
                <Bar
                  data={{ labels: s.labels, datasets: [{ data: s.data, backgroundColor: '#1D4696', borderRadius: 6 }] }}
                  options={{
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: { callbacks: { label: (c) => ` ${c.parsed.y ?? 0} orang` } },
                    },
                    scales: { y: { grid: { color: '#EEF2F7' }, ticks: { precision: 0 } }, x: { grid: { display: false } } },
                  }}
                />
              </div>
              {s.valid.length > 0 && (
                <p className="small text-secondary mt-2 mb-0">
                  Paling awal {formatDateId(s.valid[0].label)}, paling akhir {formatDateId(s.valid[s.valid.length - 1].label)}.
                </p>
              )}
            </>
          );
        } else if (q.type === 'range') {
          const r = q.range;
          const st = q.settings ?? {};
          sub = `${q.answered} jawaban, format "${startLabel(st)} … ${endLabel(st)} …"`;
          body = r ? (
            <>
              <div className="row g-2 text-center">
                {[
                  { k: 'Rata-rata per orang', v: nf.format(Number(r.avg_span)) },
                  { k: 'Jumlah seluruhnya', v: nf.format(Number(r.total_span)) },
                  { k: 'Angka awal terkecil', v: nf.format(Number(r.min_start)) },
                  { k: 'Angka akhir terbesar', v: nf.format(Number(r.max_end)) },
                ].map((x) => (
                  <div key={x.k} className="col-6">
                    <div className="border rounded-3 p-2 h-100">
                      <div className="fs-4 fw-bold" style={{ color: 'var(--laut)' }}>{x.v}</div>
                      <div className="small text-secondary">{x.k}</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="small text-secondary mt-2 mb-0">Dihitung dari angka akhir dikurangi angka awal ditambah 1. Contoh: 2 sampai 10 = 9.</p>
            </>
          ) : (
            <p className="text-secondary mb-0">Belum ada jawaban yang lengkap.</p>
          );
        } else if (hideText) {
          body = <p className="text-secondary mb-0"><i className="bi bi-eye-slash me-1" />Jawaban isian tidak ditampilkan untuk umum.</p>;
        } else if (q.type === 'short') {
          sub = 'jawaban paling sering';
          body = (
            <ul className="list-group list-group-flush">
              {q.counts.slice(0, 10).map((c) => (
                <li key={c.label} className="list-group-item d-flex justify-content-between px-0">
                  <span className="text-break me-2">{c.label}</span>
                  <span className="fw-semibold">{c.n}</span>
                </li>
              ))}
            </ul>
          );
        } else {
          sub = 'contoh jawaban terbaru, tanpa nama';
          body = (
            <div>
              {q.latest.map((t, k) => (
                <p key={k} className="quote mb-2" style={{ whiteSpace: 'pre-line' }}>{t}</p>
              ))}
            </div>
          );
        }

        return (
          <div key={q.id} className={wide ? 'col-12' : 'col-lg-6'}>
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body p-3 p-md-4">
                <h2 className="h6 fw-bold mb-1">{i + 1}. {neutral(q.title)}</h2>
                <div className="small text-secondary mb-3">
                  {TYPE_LABEL[q.type]}, {sub}
                  {q.roles.length < 3 && <>, untuk {q.roles.map((r) => ROLE_SHORT[r]).join(' & ')}</>}
                </div>
                {body}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
