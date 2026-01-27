'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/library', label: 'LIBRARY' },
  { href: '/board', label: 'MOODBOARD' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 border border-[var(--accent-cyan)] flex items-center justify-center">
              <span className="text-[var(--accent-cyan)] text-xs font-bold">MS</span>
            </div>
            <div>
              <h1 className="text-sm font-medium tracking-[4px] uppercase">
                MAISON SPECIAL
              </h1>
              <p className="text-[10px] text-[var(--text-secondary)] tracking-[2px]">
                DESIGN STUDIO
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-8">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href) ||
                (item.href === '/board' && pathname.startsWith('/generate'));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Upload Button */}
          <Link
            href="/library?upload=true"
            className="btn-glow px-4 py-2 text-xs tracking-[1px] uppercase"
          >
            + アップロード
          </Link>
        </div>
      </div>
    </nav>
  );
}
