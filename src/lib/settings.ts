import 'server-only';
import { cache } from 'react';
import { createAdminClient } from './supabase/admin';
import type { Brand, Settings } from './types';

const DEFAULTS: Settings = {
  app_name: 'Angket SMKN 3 Kepulauan Selayar',
  school_name: 'SMKN 3 Kepulauan Selayar',
  logo_url: null,
  default_fill_design: 'A',
  editor_view: 'panel',
};

export const getSettings = cache(async (): Promise<Settings> => {
  try {
    const { data } = await createAdminClient().from('app_settings').select('*').eq('id', 1).maybeSingle();
    return data ? { ...DEFAULTS, ...(data as Partial<Settings>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
});

export function toBrand(s: Settings): Brand {
  return { appName: s.app_name, schoolName: s.school_name, logo: s.logo_url || '/logo.png' };
}
