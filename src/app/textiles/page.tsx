import { Suspense } from 'react';
import TextileGallery from './TextileGallery';

function TextileLoading() {
  return (
    <div className="min-h-screen pt-20 flex items-center justify-center">
      <div className="spinner" />
    </div>
  );
}

export default function TextilesPage() {
  return (
    <Suspense fallback={<TextileLoading />}>
      <TextileGallery />
    </Suspense>
  );
}
