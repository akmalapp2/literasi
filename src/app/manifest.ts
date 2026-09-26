import type { MetadataRoute } from 'next';
import { getSettings } from '@/lib/settings';

/** Nama pendek untuk ikon layar HP, mis. "Angket SMKN 3". */
function shortName(name: string): string {
  let out = '';
  for (const w of name.split(/\s+/)) {
    if ((out + ' ' + w).trim().length > 15) break;
    out = (out + ' ' + w).trim();
  }
  return out || name.slice(0, 15);
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await getSettings();
  const icon = s.logo_url || '/logo.png';
  return {
    name: `${s.app_name} — ${s.school_name}`,
    short_name: shortName(s.app_name),
    start_url: '/admin',
    display: 'standalone',
    background_color: '#F4F7FB',
    theme_color: '#0B2B6B',
    icons: [{ src: icon, sizes: '512x512', type: 'image/png', purpose: 'any' }],
  };
}
