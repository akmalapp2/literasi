'use client';

import { ArcElement, BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { ROLE_SHORT, TYPE_LABEL, neutral } from '@/lib/text';
import type { QType, Role } from '@/lib/types';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);
ChartJS.defaults.font.family = 'var(--font-jakarta), system-ui, sans-serif';
ChartJS.defaults.color = '#4a5568';

export type QResult = {
  id: string;
  type: QType;
  title: string;
  roles: Role[];
  options: string[];
  answered: number;
  counts: { label: string; n: number }[];
  latest: string[];
};

const PALETTE = ['#0B2B6B', '#1D4696', '#7FBAF5', '#F5C400', '#C4121A', '#1F8A5B', '#8a9bbd', '#E88A1A'];

function series(q: QResult) {
  const map = new Map(q.counts.map((c) => [c.label, c.n]));
  const labels = [...q.options, ...q.counts.map((c) => c.label).filter((l) => !q.options.includes(l))];
  return { labels, data: labels.map((l) => map.get(l) ?? 0) };
}

export default function ResultsCharts({ questions, hideText }: { questions: QResult[]; hideText: boolean }) {
  if (!questions.length) return <p className="text-secondary">Angket ini belum punya pertanyaan.</p>;

  return (
    <div className="row g-3">
      {questions.map((q, i) => {
        const wide = q.type === 'long';
        let body: React.ReactNode;

        if (q.answered === 0) {
          body = <p className="text-secondary mb-0">Belum ada jawaban.</p>;
        } else if (q.type === 'radio' || q.type === 'dropdown') {
          const s = series(q);
          body = (
            <div className="chart-box">
              <Doughnut
                data={{ labels: s.labels, datasets: [{ data: s.data, backgroundColor: PALETTE, borderColor: '#fff', borderWidth: 2 }] }}
                options={{
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12 } },
                    tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.parsed} (${Math.round(((c.parsed as number) / q.answered) * 100)}%)` } },
                  },
                }}
              />
            </div>
          );
        } else if (q.type === 'checkbox') {
          const s = series(q);
          body = (
            <div className="chart-box" style={{ height: Math.max(200, s.labels.length * 44) }}>
              <Bar
                data={{ labels: s.labels, datasets: [{ data: s.data, backgroundColor: '#1D4696', borderRadius: 6 }] }}
                options={{
                  indexAxis: 'y',
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (c) => ` ${c.parsed.x} orang (${Math.round((c.parsed.x / q.answered) * 100)}%)` } },
                  },
                  scales: { x: { grid: { color: '#EEF2F7' }, ticks: { precision: 0 } }, y: { grid: { display: false } } },
                }}
              />
            </div>
          );
        } else if (hideText) {
          body = <p className="text-secondary mb-0"><i className="bi bi-eye-slash me-1" />Jawaban isian tidak ditampilkan untuk umum.</p>;
        } else if (q.type === 'short') {
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
          body = (
            <div>
              {q.latest.map((t, k) => (
                <p key={k} className="quote mb-2" style={{ whiteSpace: 'pre-line' }}>{t}</p>
              ))}
            </div>
          );
        }

        const sub =
          q.type === 'short' ? 'jawaban paling sering' : q.type === 'long' ? 'contoh jawaban terbaru, tanpa nama' : `${q.answered} jawaban`;

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
