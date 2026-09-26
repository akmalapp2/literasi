'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { signOut } from '@/actions/auth';
import { BrandMark } from '@/components/Brand';
import type { Brand } from '@/lib/types';

const NAV = [
  { href: '/admin', label: 'Angket', icon: 'bi-collection' },
  { href: '/admin/responden', label: 'Responden', icon: 'bi-people' },
  { href: '/admin/pengaturan', label: 'Pengaturan', icon: 'bi-gear' },
];

export default function AdminShell({ brand, email, children }: { brand: Brand; email: string; children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) =>
    href === '/admin' ? path === '/admin' || path.startsWith('/admin/angket') : path.startsWith(href);

  const nav = (
    <nav className="nav flex-column gap-1">
      {NAV.map((n) => (
        <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={`nav-link ${isActive(n.href) ? 'active' : ''}`}>
          <i className={`bi ${n.icon}`} />
          {n.label}
        </Link>
      ))}
    </nav>
  );
  const logout = (
    <form action={signOut}>
      <button type="submit" className="btn btn-link p-0 text-white-50 small">
        <i className="bi bi-box-arrow-left me-1" />
        Keluar
      </button>
    </form>
  );

  return (
    <div>
      <header className="admin-top d-lg-none">
        <div className="d-flex align-items-center gap-2 px-3 py-2">
          <BrandMark brand={brand} size={34} />
          <button
            type="button"
            className="btn btn-sm btn-outline-light ms-auto"
            aria-expanded={open}
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            <i className={`bi ${open ? 'bi-x-lg' : 'bi-list'}`} />
          </button>
        </div>
      </header>
      {open && (
        <div className="admin-drawer d-lg-none">
          {nav}
          <div className="mt-2 d-flex justify-content-between align-items-center small text-white-50 px-2">
            <span className="text-truncate me-2">{email}</span>
            {logout}
          </div>
        </div>
      )}
      <div className="d-flex">
        <aside className="sidebar d-none d-lg-flex flex-column p-3">
          <BrandMark brand={brand} size={46} className="mb-4 px-1" />
          {nav}
          <div className="mt-auto small text-white-50 px-2">
            <div className="text-truncate mb-1">{email}</div>
            {logout}
          </div>
        </aside>
        <main className="flex-grow-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
