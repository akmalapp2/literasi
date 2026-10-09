import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import PrintButton from '@/components/admin/PrintButton';
import { requireAdmin } from '@/lib/auth';
import { usedThisPeriod, type RepeatMode } from '@/lib/period';
import { getSettings, toBrand } from '@/lib/settings';
import { roleDetail } from '@/lib/text';
import type { Respondent, Role } from '@/lib/types';
import { getBaseUrl } from '@/lib/url';
import { fetchAll } from '@/lib/fetch-all';

export const metadata: Metadata = { title: 'Kartu QR' };

type Row = { id: string; token: string; used_at: string | null; respondents: Respondent };

export default async function QrPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ peran?: string; kelas?: string; belum?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const { data: form } = await supabase.from('forms').select('id, title, repeat_mode').eq('id', id).maybeSingle();
  if (!form) notFound();

  const [data, settings, baseUrl] = await Promise.all([
    fetchAll((a, b) =>
      supabase.from('access_tokens').select('id, token, used_at, respondents(id, name, identifier, role, class_name, subject, phone)').eq('form_id', id).order('id').range(a, b),
    ),
    getSettings(),
    getBaseUrl(),
  ]);
  const brand = toBrand(settings);

  const rows = ((data ?? []) as unknown as Row[])
    .filter((r) => r.respondents)
    .filter((r) => !sp.peran || r.respondents.role === (sp.peran as Role))
    .filter((r) => !sp.kelas || r.respondents.class_name === sp.kelas)
    .filter((r) => sp.belum !== '1' || !usedThisPeriod(form.repeat_mode as RepeatMode, r.used_at))
    .sort((a, b) => ((a.respondents.class_name ?? '') + a.respondents.name).localeCompare((b.respondents.class_name ?? '') + b.respondents.name, 'id'));

  const cards = await Promise.all(
    rows.map(async (r) => ({
      ...r,
      url: `${baseUrl}/isi/${r.token}`,
      qr: await QRCode.toDataURL(`${baseUrl}/isi/${r.token}`, { margin: 1, width: 220, errorCorrectionLevel: 'M', color: { dark: '#0B2B6B', light: '#ffffff' } }),
    })),
  );

  return (
    <div className="p-3 p-lg-4">
      <div className="no-print d-flex flex-wrap align-items-center gap-2 mb-3">
        <Link href={`/admin/angket/${id}/responden`} className="btn btn-sm btn-link px-0 text-decoration-none">
          <i className="bi bi-arrow-left" /> Kembali
        </Link>
        <h1 className="h5 fw-bold mb-0 me-auto">Kartu QR, {cards.length} kartu</h1>
        <PrintButton />
      </div>
      <p className="no-print small text-secondary">
        Cetak di kertas A4, lalu gunting dan bagikan. Setiap kartu hanya untuk satu orang{form.repeat_mode === 'mingguan' ? ', dan bisa dipakai lagi setiap minggu' : form.repeat_mode === 'harian' ? ', dan bisa dipakai lagi setiap hari' : ' dan hanya bisa dipakai sekali'}.
        {sp.kelas && <> Kelas: <strong>{sp.kelas}</strong>.</>}
      </p>
      {cards.length === 0 ? (
        <p className="text-secondary">Tidak ada kartu. Buat link responden terlebih dahulu.</p>
      ) : (
        <div className="qr-grid">
          {cards.map((c) => (
            <div key={c.id} className="qr-card">
              <div className="d-flex align-items-center gap-2 justify-content-center mb-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={brand.logo} width={26} height={24} alt="" className="logo" />
                <div className="small fw-bold text-start lh-sm">{brand.appName}<div className="fw-normal text-secondary" style={{ fontSize: '.7rem' }}>{brand.schoolName}</div></div>
              </div>
              <div className="small fw-semibold mb-1">{form.title}</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.qr} width={150} height={150} alt={`QR untuk ${c.respondents.name}`} />
              <div className="fw-bold mt-1">{c.respondents.name}</div>
              <div className="small text-secondary">
                {roleDetail(c.respondents.role, c.respondents.class_name, c.respondents.subject)}
              </div>
              <div className="small mt-1">Kode: <strong style={{ letterSpacing: '.1em' }}>{c.token}</strong></div>
              <div className="text-secondary" style={{ fontSize: '.65rem', overflowWrap: 'anywhere' }}>{c.url}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
