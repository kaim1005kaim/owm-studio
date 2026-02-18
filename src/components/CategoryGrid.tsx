'use client';

import { CategoryConfig } from '@/config/clients';

interface CategoryGridProps {
  categories: CategoryConfig[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * Visual category selector grid for garment types
 * Shows categories as selectable cards with labels
 */
export default function CategoryGrid({
  categories,
  selectedId,
  onSelect,
}: CategoryGridProps) {
  return (
    <div className="space-y-3">
      <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">
        カテゴリ選択
      </label>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {categories.map((category) => {
          const isSelected = selectedId === category.id;

          return (
            <button
              key={category.id}
              onClick={() => onSelect(category.id)}
              className={`
                py-3 px-2 text-center rounded transition-all duration-200
                ${isSelected
                  ? 'bg-[var(--foreground)] text-[var(--background)] shadow-sm'
                  : 'bg-[var(--background-card)] text-[var(--text-secondary)] hover:text-[var(--foreground)] border border-[var(--text-inactive)]/30 hover:border-[var(--foreground)]/50'
                }
              `}
            >
              <span className="text-xs font-medium">
                {category.labelJa}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected category description */}
      {selectedId && (
        <p className="text-xs text-[var(--text-inactive)] mt-2">
          {categories.find(c => c.id === selectedId)?.description}
        </p>
      )}
    </div>
  );
}
