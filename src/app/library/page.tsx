import { Suspense } from 'react';
import LibraryClient from './LibraryClient';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <LibraryClient />
    </Suspense>
  );
}
