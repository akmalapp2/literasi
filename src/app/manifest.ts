import type { MetadataRoute } from 'next';
import { getSettings } from '@/lib/settings';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await getSettings();
  const icon = s.logo_url || '/logo.png';
  return {
    name: `${s.app_name} — ${s.school_name}`,
    short_name: s.app_name.length > 24 ? s.app_name.slice(0, 24) : s.app_name,
    start_url: '/admin',
    display: 'standalone',
    background_color: '#F4F7FB',
    theme_color: '#0B2B6B',
    icons: [{ src: icon, sizes: '512x512', type: 'image/png', purpose: 'any' }],
  };
}
