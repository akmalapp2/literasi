'use client';

import { useState } from 'react';
import FillApp from '@/components/fill/FillApp';
import { ROLE_LABEL } from '@/lib/text';
import type { Brand, FillDesign, Question, Role } from '@/lib/types';

type Props = {
  brand: Brand;
  form: { id: string; title: string; description: string; slug: string; showResultsLink: boolean };
  questions: Question[];
  targets: Role[];
  initialDesign: FillDesign;
};

const SAMPLE: Record<Role, { name: string; detail: string }> = {
  kepsek: { name: 'Contoh Kepala Sekolah', detail: 'Kepala Sekolah' },
  guru: { name: 'Contoh Guru, S.Pd.', detail: 'Guru, Bahasa Indonesia' },
  tendik: { name: 'Contoh Staf TU', detail: 'Tenaga Kependidikan, Tata Usaha' },
  siswa: { name: 'Andi Pratama', detail: 'Siswa, kelas XI NKPI 1' },
  ortu: { name: 'Contoh Orang Tua', detail: 'Orang tua/wali, kelas XI NKPI 1' },
  alumni: { name: 'Rina Alumni', detail: 'Alumni, lulus 2024' },
  umum: { name: 'Contoh Warga', detail: 'Masyarakat Umum' },
};

export default function PreviewBox({ brand, form, questions, targets, initialDesign }: Props) {
  const [role, setRole] = useState<Role>(targets.includes('siswa') ? 'siswa' : targets[0]);
  const [design, setDesign] = useState<FillDesign>(initialDesign);
  return (
    <div>
      <div className="design-bar px-3 py-2 d-flex flex-wrap align-items-center gap-2">
        <span className="badge text-bg-warning">Pratinjau</span>
        <span className="small fw-semibold text-secondary">Desain:</span>
        <div className="btn-group btn-group-sm" role="group" aria-label="Desain">
          {(['A', 'B'] as FillDesign[]).map((d) => (
            <button type="button" key={d} className={`btn btn-outline-primary ${design === d ? 'active' : ''}`} onClick={() => setDesign(d)}>
              {d === 'A' ? 'A. Fokus satu per satu' : 'B. Obrolan'}
            </button>
          ))}
        </div>
        <label className="small fw-semibold text-secondary ms-md-3" htmlFor="pvRole">Lihat sebagai:</label>
        <select id="pvRole" className="form-select form-select-sm w-auto" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          {targets.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
      </div>
      <FillApp
        key={`${role}-${design}`}
        brand={brand}
        form={form}
        questions={questions}
        design={design}
        targets={targets}
        mode="preview"
        respondent={{ ...SAMPLE[role], role }}
      />
    </div>
  );
}
