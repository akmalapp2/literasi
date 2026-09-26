import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Selalu dijalankan segar (tanpa cache) supaya benar-benar menyentuh database.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Health check untuk "heartbeat" penjaga Supabase agar tidak ter-pause.
 * Melakukan satu query ringan ke database. Aman diakses publik: hanya
 * membaca satu baris pengaturan, tidak membocorkan data responden.
 */
export async function GET() {
  try {
    const { error } = await createAdminClient().from('app_settings').select('id').eq('id', 1).maybeSingle();
    if (error) throw error;
    return NextResponse.json(
      { ok: true, at: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
