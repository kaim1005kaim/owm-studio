'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    document.title = 'MAISON SPECIAL Design Studio';
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      {/* Hero Section */}
      <div className="text-center max-w-2xl fade-in">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto border border-[var(--accent-cyan)] flex items-center justify-center mb-4">
            <span className="text-[var(--accent-cyan)] text-2xl font-bold tracking-[4px]">MS</span>
          </div>
          <h1 className="text-3xl tracking-[8px] uppercase mb-2">MAISON SPECIAL</h1>
          <p className="text-sm text-[var(--text-secondary)] tracking-[4px] uppercase">
            Design Studio
          </p>
        </div>

        {/* Description */}
        <p className="text-[var(--text-secondary)] mb-12 leading-relaxed">
          AIを活用したファッションデザイン生成ツール。参照画像をアップロードし、ムードボードを作成、
          インテリジェントな編集機能でデザインバリエーションを生成します。
        </p>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          <button
            onClick={() => router.push('/library')}
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
            <h3 className="text-sm tracking-[2px] uppercase mb-1">LIBRARY</h3>
            <p className="text-xs text-[var(--text-secondary)]">参照画像の閲覧・アップロード</p>
          </button>

          <button
            onClick={() => router.push('/board')}
            className="glass-card p-6 text-left hover:border-[var(--accent-amber)] transition-all group"
          >
            <svg
              className="w-8 h-8 mb-4 text-[var(--text-inactive)] group-hover:text-[var(--accent-amber)] transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h3 className="text-sm tracking-[2px] uppercase mb-1">MOODBOARD</h3>
            <p className="text-xs text-[var(--text-secondary)]">参照画像セットの作成</p>
          </button>
        </div>

        {/* Workflow Steps */}
        <div className="mt-16 pt-8 border-t border-[var(--text-inactive)]">
          <h2 className="text-xs tracking-[4px] uppercase text-[var(--text-secondary)] mb-8">
            ワークフロー
          </h2>
          <div className="flex items-center justify-center gap-4 text-xs text-[var(--text-inactive)]">
            <span className="flex items-center gap-2">
              <span className="w-6 h-6 border border-current flex items-center justify-center">1</span>
              アップロード
            </span>
            <span>→</span>
            <span className="flex items-center gap-2">
              <span className="w-6 h-6 border border-current flex items-center justify-center">2</span>
              ムードボード
            </span>
            <span>→</span>
            <span className="flex items-center gap-2">
              <span className="w-6 h-6 border border-current flex items-center justify-center">3</span>
              デザイン生成
            </span>
            <span>→</span>
            <span className="flex items-center gap-2">
              <span className="w-6 h-6 border border-current flex items-center justify-center">4</span>
              再編集
            </span>
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
