'use client';

import Image from 'next/image';

interface TextileCardProps {
  id: string;
  imageUrl: string;
  thumbUrl?: string;
  title: string;
  artistName: string;
  collection?: string;
  onSelect?: (id: string) => void;
  selected?: boolean;
  onClick?: () => void;
}

/**
 * Textile card component for Heralbony's art-focused gallery
 * Displays artwork with prominent artist attribution
 */
export default function TextileCard({
  id,
  imageUrl,
  thumbUrl,
  title,
  artistName,
  collection,
  onSelect,
  selected = false,
  onClick,
}: TextileCardProps) {
  const handleClick = () => {
    if (onSelect) {
      onSelect(id);
    }
    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      className={`textile-card group cursor-pointer overflow-hidden rounded-sm transition-all duration-300 ${
        selected ? 'ring-2 ring-[var(--foreground)] ring-offset-2 ring-offset-[var(--background)]' : ''
      }`}
      onClick={handleClick}
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-[var(--background-card)]">
        <Image
          src={thumbUrl || imageUrl}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Selection Indicator */}
        {selected && (
          <div className="absolute top-3 right-3 w-6 h-6 bg-[var(--foreground)] rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-[var(--background)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
      </div>

      {/* Info Section */}
      <div className="p-4">
        {/* Artist Name */}
        <p className="artist-name mb-1">{artistName}</p>

        {/* Textile Title */}
        <h3 className="textile-title line-clamp-1">{title}</h3>

        {/* Collection (optional) */}
        {collection && (
          <p className="text-xs text-[var(--text-inactive)] mt-1">{collection}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Skeleton loader for textile card
 */
export function TextileCardSkeleton() {
  return (
    <div className="textile-card overflow-hidden rounded-sm">
      <div className="aspect-square skeleton" />
      <div className="p-4 space-y-2">
        <div className="h-3 w-20 skeleton" />
        <div className="h-4 w-32 skeleton" />
      </div>
    </div>
  );
}
