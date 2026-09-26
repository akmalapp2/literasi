export type Role = 'kepsek' | 'guru' | 'tendik' | 'siswa' | 'ortu' | 'alumni' | 'umum';
export const ROLES: Role[] = ['kepsek', 'guru', 'tendik', 'siswa', 'ortu', 'alumni', 'umum'];

export type QType = 'short' | 'long' | 'radio' | 'checkbox' | 'dropdown' | 'date' | 'range';
export const QTYPES: QType[] = ['short', 'long', 'radio', 'checkbox', 'dropdown', 'date', 'range'];

/** Pengaturan tambahan per pertanyaan (kolom questions.settings). */
export type QSettings = {
  /** Pilihan ganda / kotak centang / dropdown: tambahkan opsi "Lainnya" yang bisa diketik. */
  allow_other?: boolean;
  other_label?: string;
  /** Rentang angka, mis. "Mulai halaman" 2 "sampai halaman" 10. */
  start_label?: string;
  end_label?: string;
  min?: number | null;
  max?: number | null;
};

export type Question = {
  id: string;
  type: QType;
  title: string;
  required: boolean;
  roles: Role[];
  options: string[];
  settings: QSettings;
};

export type FormStatus = 'draf' | 'terbit' | 'ditutup';
export type AccessMode = 'token' | 'kode' | 'terbuka';
/** Mode Terbuka: siapa yang wajib mengisi nomor induk. */
export type OpenId = 'none' | 'siswa' | 'semua';
export type FillDesign = 'A' | 'B';
export type EditorView = 'kartu' | 'panel';

export type FormMeta = {
  title: string;
  description: string;
  slug: string;
  targets: Role[];
  status: FormStatus;
  access_mode: AccessMode;
  access_code: string | null;
  open_id: OpenId;
  fill_design: 'ikut' | FillDesign;
  opens_at: string | null;
  closes_at: string | null;
  public_results: boolean;
  hide_text_public: boolean;
  results_after_close: boolean;
};

export type FormRow = FormMeta & {
  id: string;
  created_at: string;
  updated_at: string;
};

export type Settings = {
  app_name: string;
  school_name: string;
  logo_url: string | null;
  default_fill_design: FillDesign;
  editor_view: EditorView;
};

export type Brand = { appName: string; schoolName: string; logo: string };

export type Respondent = {
  id: string;
  name: string;
  identifier: string;
  role: Role;
  class_name: string | null;
  subject: string | null;
  phone: string | null;
  active: boolean;
};

export type AnswerValue = string | string[];
export type Answers = Record<string, AnswerValue>;

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };
