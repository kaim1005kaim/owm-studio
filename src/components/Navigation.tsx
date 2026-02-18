'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useClient, useNavigation, useFeature } from '@/context/ClientContext';

export default function Navigation() {
  const pathname = usePathname();
  const client = useClient();
  const navItems = useNavigation();
  const hasTextileLibrary = useFeature('textileLibrary');

  // Determine which paths should highlight each nav item
  const isNavActive = (href: string) => {
    if (pathname.startsWith(href)) return true;
    // For MS: /generate should highlight MOODBOARD
    if (href === '/board' && pathname.startsWith('/generate')) return true;
    // For HB: /create should highlight CREATE nav (if exists)
    if (href === '/create' && pathname.startsWith('/create')) return true;
    return false;
  };

  // Upload destination varies by client
  const uploadHref = hasTextileLibrary ? '/textiles?upload=true' : '/library?upload=true';
  const uploadLabel = hasTextileLibrary ? '+ テキスタイル追加' : '+ アップロード';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 border border-[var(--accent-cyan)] flex items-center justify-center">
              <span className="text-[var(--accent-cyan)] text-xs font-bold">{client.logoText}</span>
            </div>
            <div>
              <h1 className="text-sm font-medium tracking-[4px] uppercase">
                {client.brandName}
              </h1>
              <p className="text-[10px] text-[var(--text-secondary)] tracking-[2px]">
                {client.tagline}
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center gap-8">
            {navItems.map((item) => {
              const isActive = isNavActive(item.href);
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
            href={uploadHref}
            className="btn-glow px-4 py-2 text-xs tracking-[1px] uppercase"
          >
            {uploadLabel}
          </Link>
        </div>
      </div>
    </nav>
  );
}
