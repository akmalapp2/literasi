import type { AnswerValue, Answers, Brand, Question, Role } from '@/lib/types';

export type Who = { name: string; detail: string } | null;

export type DesignProps = {
  brand: Brand;
  title: string;
  description: string;
  questions: Question[];
  role: Role;
  who: Who;
  answers: Answers;
  setAnswer: (id: string, v: AnswerValue) => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
  canSubmit: boolean;
  /** Elemen tambahan sebelum tombol kirim (misalnya Turnstile). */
  extra?: React.ReactNode;
  preview?: boolean;
};
