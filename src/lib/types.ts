export type Role = 'kepsek' | 'guru' | 'siswa';
export const ROLES: Role[] = ['kepsek', 'guru', 'siswa'];

export type QType = 'short' | 'long' | 'radio' | 'checkbox' | 'dropdown';
export const QTYPES: QType[] = ['short', 'long', 'radio', 'checkbox', 'dropdown'];

export type Question = {
  id: string;
  type: QType;
  title: string;
  required: boolean;
  roles: Role[];
  options: string[];
};

export type FormStatus = 'draf' | 'terbit' | 'ditutup';
export type AccessMode = 'token' | 'kode' | 'terbuka';
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
