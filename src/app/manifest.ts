import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gerakan Literasi Sekolah — SMKN 3 Kepulauan Selayar',
    short_name: 'Literasi Sekolah',
    start_url: '/admin',
    display: 'standalone',
    background_color: '#F4F7FB',
    theme_color: '#0B2B6B',
    icons: [{ src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' }],
  };
}
