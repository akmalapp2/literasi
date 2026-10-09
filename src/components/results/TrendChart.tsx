'use client';

import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { ROLE_LABEL } from '@/lib/text';
import type { Role } from '@/lib/types';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

/** Warna tetap per peran (urutan tetap, divalidasi untuk buta warna di latar terang). */
const ROLE_COLOR: Partial<Record<Role, string>> = {
  kepsek: '#C4121A',
  guru: '#3A66C4',
  tendik: '#1F8A5B',
  siswa: '#B88A00',
};
const OTHER_COLOR = '#8a9bbd';

export type TrendPoint = { key: string; label: string; long: string; counts: Partial<Record<Role, number>> };

/** Grafik batang bertumpuk: jumlah pengisi per minggu/hari, dipisah per peran. */
export default function TrendChart({ points, roles, unit }: { points: TrendPoint[]; roles: Role[]; unit: string }) {
  if (points.length === 0) return <p className="text-secondary mb-0">Belum ada data.</p>;
  const main = roles.filter((r) => ROLE_COLOR[r]);
  const rest = roles.filter((r) => !ROLE_COLOR[r]);
  const series = [
    ...main.map((r) => ({ name: ROLE_LABEL[r], color: ROLE_COLOR[r]!, get: (p: TrendPoint) => p.counts[r] ?? 0 })),
    ...(rest.length ? [{ name: 'Lainnya', color: OTHER_COLOR, get: (p: TrendPoint) => rest.reduce((s, r) => s + (p.counts[r] ?? 0), 0) }] : []),
  ];
  const totals = points.map((p) => series.reduce((s, x) => s + x.get(p), 0));

  return (
    <>
      <div className="chart-box" style={{ height: 260 }}>
        <Bar
          data={{
            labels: points.map((p) => p.label),
            datasets: series.map((s, i) => ({
              label: s.name,
              data: points.map(s.get),
              backgroundColor: s.color,
              borderColor: '#ffffff',
              borderWidth: { top: 2, bottom: 0, left: 0, right: 0 },
              borderRadius: i === series.length - 1 ? { topLeft: 4, topRight: 4 } : 0,
              borderSkipped: false,
              maxBarThickness: 36,
            })),
          }}
          options={{
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
              legend: { position: 'bottom', labels: { boxWidth: 12, boxHeight: 12 } },
              tooltip: {
                callbacks: {
                  title: (items) => points[items[0]?.dataIndex ?? 0]?.long ?? '',
                  footer: (items) => `Total: ${totals[items[0]?.dataIndex ?? 0]} orang`,
                },
              },
            },
            scales: {
              x: { stacked: true, grid: { display: false } },
              y: { stacked: true, beginAtZero: true, grid: { color: '#EEF2F7' }, ticks: { precision: 0 }, title: { display: true, text: 'Jumlah pengisi' } },
            },
          }}
        />
      </div>
      <details className="mt-2">
        <summary className="small text-secondary">Lihat sebagai tabel</summary>
        <div className="table-responsive mt-2">
          <table className="table table-sm small mb-0">
            <thead>
              <tr><th>{unit}</th>{series.map((s) => <th key={s.name} className="text-end">{s.name}</th>)}<th className="text-end">Total</th></tr>
            </thead>
            <tbody>
              {points.map((p, i) => (
                <tr key={p.key}>
                  <td>{p.long}</td>
                  {series.map((s) => <td key={s.name} className="text-end">{s.get(p)}</td>)}
                  <td className="text-end fw-semibold">{totals[i]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
