# Gerakan Literasi Sekolah — SMKN 3 Kepulauan Selayar

Aplikasi angket (mirip Google Form) untuk kepala sekolah, guru, dan siswa.
Satu jenis akun saja: **admin**. Responden mengisi tanpa login.

**Stack:** Next.js 16 (App Router) · Supabase (Postgres, Auth, Storage) · Bootstrap 5 · Chart.js · GitHub + Vercel

## Fitur
- Admin: buat/ubah/hapus angket dan pertanyaan (isian singkat, isian panjang, pilihan ganda, kotak centang, dropdown), tiap pertanyaan bisa diatur tampil untuk kepsek/guru/siswa.
- Editor dengan 2 tampilan: **1. Kartu** dan **2. Panel + pratinjau HP**. Bawaan dipilih di menu Pengaturan.
- Halaman isi dengan 2 desain: **A. Fokus satu per satu** dan **B. Obrolan**. Bawaan dipilih di Pengaturan, bisa diganti per angket.
- 3 mode masuk responden per angket: link/QR pribadi (sekali pakai), kode angket + NISN/NIP, atau terbuka anonim (+ Cloudflare Turnstile).
- Data responden: tambah manual atau impor Excel (ada template).
- Link pribadi: salin, kirim lewat WhatsApp, cetak kartu QR per kelas, buat ulang link, izinkan isi ulang.
- Hasil publik tanpa nama, grafik per pertanyaan, saring per peran & kelas. Unduh semua jawaban (CSV untuk Excel).
- Tampilan responsif (HP, tablet, laptop). Tabel berubah jadi kartu di HP.

## Struktur
```
supabase/migrations/0001_init.sql   Skema, RLS, fungsi submit_response & form_results
src/proxy.ts                        Melindungi /admin (Next.js 16: pengganti middleware)
src/app/                            Halaman (admin, /isi/[token], /f/[slug], /hasil/[slug])
src/actions/                        Server Actions (simpan angket, responden, link, pengaturan, kirim jawaban)
src/components/editor/              Editor: CardsView (1), PanelView (2), PhonePreview, AccessPanel
src/components/fill/                Halaman isi: DesignA, DesignB, FillApp
src/lib/                            Supabase client, auth, teks, tipe
```

## Pemasangan

### 1. Supabase
1. Buat proyek di https://supabase.com (region terdekat: Singapore).
2. **SQL Editor** → tempel isi `supabase/migrations/0001_init.sql` → Run.
3. **Authentication → Users → Add user**: buat akun admin (email + kata sandi, centang *Auto Confirm*).
4. Jadikan akun itu admin (SQL Editor):
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'admin@smkn3selayar.sch.id';
   ```
5. **Authentication → Sign In / Providers → Email**: matikan *Allow new users to sign up* agar tidak ada orang lain yang bisa mendaftar.
6. **Project Settings → API Keys**: salin *Project URL*, *Publishable key*, dan *Secret key*.

### 2. Jalankan di komputer
```bash
cp .env.example .env.local     # lalu isi nilainya
npm install
npm run dev                    # buka http://localhost:3000/admin
```
Butuh Node.js 20.9 atau lebih baru.

### 3. GitHub
```bash
git init
git add .
git commit -m "Gerakan Literasi Sekolah"
git branch -M main
git remote add origin https://github.com/<akun>/gerakan-literasi-sekolah.git
git push -u origin main
```
Ikut sertakan `package-lock.json` yang terbentuk setelah `npm install`.

### 4. Online (Vercel, gratis)
1. https://vercel.com → **Add New Project** → pilih repo GitHub tadi.
2. Isi **Environment Variables** sama seperti `.env.local`. `NEXT_PUBLIC_SITE_URL` diisi alamat Vercel/domain sekolah (mis. `https://literasi.smkn3selayar.sch.id`).
3. Deploy. Setiap `git push` ke `main` otomatis memperbarui aplikasi.
4. Di Supabase **Authentication → URL Configuration**, isi *Site URL* dengan alamat yang sama.

### 5. Opsional: Cloudflare Turnstile (mode Terbuka)
Buat widget di dasbor Cloudflare → Turnstile, lalu isi `NEXT_PUBLIC_TURNSTILE_SITE_KEY` dan `TURNSTILE_SECRET_KEY`. Jika kosong, verifikasi dilewati.

## Alur kerja admin
1. **Responden** → impor Excel (unduh template dulu) atau tambah manual.
2. **Angket → Buat angket** → susun pertanyaan → tab *Akses & pengaturan* → pilih sasaran, mode masuk, jadwal → ubah status ke **Terbit** → **Simpan**.
3. **Responden** (tombol di editor) → *Buat link untuk semua responden* → bagikan lewat WhatsApp atau cetak kartu QR per kelas.
4. Pantau di **/hasil/&lt;alamat-angket&gt;**, unduh CSV bila perlu.

## Keamanan singkat
- Semua tabel memakai RLS. Hanya pengguna di tabel `admins` yang bisa membaca/mengubah data.
- Responden tidak mengakses database langsung. Halaman isi & hasil dirender di server memakai secret key, dan jawaban disimpan lewat fungsi `submit_response` (atomik: token ditandai terpakai bersamaan dengan jawaban).
- `SUPABASE_SECRET_KEY` hanya ada di server. Jangan beri awalan `NEXT_PUBLIC_`.
- Halaman hasil publik hanya menampilkan agregat tanpa nama. Jawaban isian bisa disembunyikan per angket.

## Tips teks pertanyaan
Tulis `{kamu}` agar otomatis menjadi "kamu" untuk siswa dan "Bapak/Ibu" untuk guru & kepala sekolah, dan `{tugas}` menjadi "jam pelajaran" / "tugas mengajar" / "tugas dinas".
