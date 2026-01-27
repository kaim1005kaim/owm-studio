'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RefinePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/library');
  }, [router]);

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center">
      <p className="text-sm text-[var(--text-secondary)]">リダイレクト中...</p>
    </div>
  );
}
