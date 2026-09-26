import Link from 'next/link';
import { BrandMark } from '@/components/Brand';
import { formWindow, resultsVisible, scheduleText } from '@/lib/form-window';
import { getSettings, toBrand } from '@/lib/settings';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDay } from '@/lib/text';
import type { FormRow } from '@/lib/types';
import Credit from '@/components/Credit';

export default async function Home() {
  const brand = toBrand(await getSettings());
  const { data } = await createAdminClient()
    .from('forms')
    .select('id, slug, title, status, access_mode, opens_at, closes_at, open_days, open_time, close_time, public_results, results_after_close')
    .neq('status', 'draf')
    .order('created_at', { ascending: false });
  const forms = (data ?? []) as FormRow[];
  // Tampilkan angket yang sedang dibuka, juga yang terjadwal mingguan (mis. setiap Jumat).
  const open = forms.filter(
    (f) => f.access_mode !== 'token' && (formWindow(f).open || (!!scheduleText(f) && formWindow({ ...f, open_days: [], open_time: null, close_time: null }).open)),
  );
  const results = forms.filter((f) => resultsVisible(f));

  return (
    <div>
      <header className="hasil-head">
        <div className="container py-4" style={{ maxWidth: 820 }}>
          <BrandMark brand={brand} size={56} />
        </div>
      </header>
      <main className="container py-4" style={{ maxWidth: 820 }}>
        {open.length > 0 && (
          <section className="mb-4">
            <h1 className="h5 fw-bold mb-3">Angket yang sedang dibuka</h1>
            <div className="d-flex flex-column gap-2">
              {open.map((f) => (
                <Link key={f.id} href={`/f/${f.slug}`} className="list-card text-decoration-none d-flex align-items-center gap-3">
                  <i className="bi bi-pencil-square fs-4 text-primary" />
                  <div className="flex-grow-1 min-w-0">
                    <div className="fw-semibold text-body">{f.title}</div>
                    {scheduleText(f) && (
                      <div className="small">
                        {formWindow(f).open
                          ? <span className="badge-soft st-terbit me-1">Dibuka sekarang</span>
                          : <span className="badge-soft st-draf me-1">Belum waktunya</span>}
                        <span className="text-secondary">Jadwal: {scheduleText(f)}</span>
                      </div>
                    )}
                    {f.closes_at && <div className="small text-secondary">Ditutup {formatDay(f.closes_at)}</div>}
                  </div>
                  <i className="bi bi-chevron-right text-secondary" />
                </Link>
              ))}
            </div>
          </section>
        )}
        <section>
          <h2 className="h5 fw-bold mb-3">Hasil angket</h2>
          {results.length === 0 ? (
            <p className="text-secondary">Belum ada hasil angket yang dipublikasikan.</p>
          ) : (
            <div className="d-flex flex-column gap-2">
              {results.map((f) => (
                <Link key={f.id} href={`/hasil/${f.slug}`} className="list-card text-decoration-none d-flex align-items-center gap-3">
                  <i className="bi bi-bar-chart fs-4 text-primary" />
                  <div className="flex-grow-1 fw-semibold text-body">{f.title}</div>
                  <i className="bi bi-chevron-right text-secondary" />
                </Link>
              ))}
            </div>
          )}
        </section>
        <Credit className="mt-5" />
      </main>
    </div>
  );
}
