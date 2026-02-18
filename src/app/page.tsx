'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useClient, useContent, useFeature, useNavigation } from '@/context/ClientContext';

export default function Home() {
  const router = useRouter();
  const client = useClient();
  const content = useContent();
  const navItems = useNavigation();
  const hasTextileLibrary = useFeature('textileLibrary');
  const hasMoodboards = useFeature('moodboards');

  useEffect(() => {
    document.title = content.homeTitle;
  }, [content.homeTitle]);

  // Determine primary and secondary actions based on client features
  const primaryAction = hasTextileLibrary
    ? { href: '/textiles', label: 'TEXTILES', description: 'テキスタイルギャラリーを閲覧' }
    : { href: '/library', label: 'LIBRARY', description: '参照画像の閲覧・アップロード' };

  const secondaryAction = hasTextileLibrary
    ? { href: '/create', label: 'CREATE', description: 'テキスタイルからデザインを生成' }
    : { href: '/board', label: 'MOODBOARD', description: '参照画像セットの作成' };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      {/* Hero Section */}
      <div className="text-center max-w-2xl fade-in">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto border border-[var(--accent-cyan)] flex items-center justify-center mb-4">
            <span className="text-[var(--accent-cyan)] text-2xl font-bold tracking-[4px]">{client.logoText}</span>
          </div>
          <h1 className="text-3xl tracking-[8px] uppercase mb-2">{client.brandName}</h1>
          <p className="text-sm text-[var(--text-secondary)] tracking-[4px] uppercase">
            {client.tagline}
          </p>
        </div>

        {/* Description */}
        <p className="text-[var(--text-secondary)] mb-12 leading-relaxed">
          {content.homeDescription}
        </p>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          <button
            onClick={() => router.push(primaryAction.href)}
            className="glass-card p-6 text-left hover:border-[var(--accent-cyan)] transition-all group"
          >
            <svg
              className="w-8 h-8 mb-4 text-[var(--text-inactive)] group-hover:text-[var(--accent-cyan)] transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="text-sm tracking-[2px] uppercase mb-1">{primaryAction.label}</h3>
            <p className="text-xs text-[var(--text-secondary)]">{primaryAction.description}</p>
          </button>

          <button
            onClick={() => router.push(secondaryAction.href)}
            className="glass-card p-6 text-left hover:border-[var(--accent-amber)] transition-all group"
          >
            <svg
              className="w-8 h-8 mb-4 text-[var(--text-inactive)] group-hover:text-[var(--accent-amber)] transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {hasTextileLibrary ? (
                // Create/Generate icon
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M12 4v16m8-8H4"
                />
              ) : (
                // Moodboard icon
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              )}
            </svg>
            <h3 className="text-sm tracking-[2px] uppercase mb-1">{secondaryAction.label}</h3>
            <p className="text-xs text-[var(--text-secondary)]">{secondaryAction.description}</p>
          </button>
        </div>

        {/* Workflow Steps */}
        <div className="mt-16 pt-8 border-t border-[var(--text-inactive)]">
          <h2 className="text-xs tracking-[4px] uppercase text-[var(--text-secondary)] mb-8">
            ワークフロー
          </h2>
          <div className="flex items-center justify-center gap-4 text-xs text-[var(--text-inactive)]">
            {content.workflowSteps.map((step, index) => (
              <span key={index} className="flex items-center gap-2">
                {index > 0 && <span className="mr-2">→</span>}
                <span className="w-6 h-6 border border-current flex items-center justify-center">{index + 1}</span>
                {step}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-8 text-xs text-[var(--text-inactive)] tracking-[2px]">
        Powered by OWM Technology
      </footer>
    </div>
  );
}
