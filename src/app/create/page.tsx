import { Suspense } from 'react';
import CreateClient from './CreateClient';

function CreateLoading() {
  return (
    <div className="min-h-screen pt-20 flex items-center justify-center">
      <div className="spinner" />
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense fallback={<CreateLoading />}>
      <CreateClient />
    </Suspense>
  );
}
