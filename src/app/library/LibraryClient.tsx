'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ImageGrid from '@/components/ImageGrid';
import UploadModal from '@/components/UploadModal';
import BoardSelectModal from '@/components/BoardSelectModal';
import { useToast } from '@/components/Toast';

const WORKSPACE_SLUG = 'maison_demo';
const PAGE_TITLE = 'ライブラリ - MAISON SPECIAL';

interface Asset {
  id: string;
  url: string;
  thumbUrl: string | null;
  title: string;
  caption?: string;
  tags?: string[];
  silhouette?: string;
  material?: string;
  mood?: string;
  source: string;
  collection?: string;
}

interface Filters {
  collections: string[];
  silhouettes: string[];
  materials: string[];
  moods: string[];
  tags: string[];
}

export default function LibraryClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [showBoardSelect, setShowBoardSelect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [activeFilters, setActiveFilters] = useState<{
    source?: string;
    collection?: string;
    tags?: string[];
    silhouette?: string;
    material?: string;
    mood?: string;
  }>({});
  const [showUpload, setShowUpload] = useState(searchParams.get('upload') === 'true');

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ workspaceSlug: WORKSPACE_SLUG });

      if (activeFilters.source) params.append('source', activeFilters.source);
      if (activeFilters.collection) params.append('collection', activeFilters.collection);
      if (activeFilters.silhouette) params.append('silhouette', activeFilters.silhouette);
      if (activeFilters.material) params.append('material', activeFilters.material);
      if (activeFilters.mood) params.append('mood', activeFilters.mood);
      if (activeFilters.tags?.length) params.append('tags', activeFilters.tags.join(','));

      const res = await fetch(`/api/assets?${params}`);
      const data = await res.json();

      if (data.success) {
        setAssets(data.assets);
      }
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    } finally {
      setLoading(false);
    }
  }, [activeFilters]);

  const fetchFilters = async () => {
    try {
      const res = await fetch(`/api/assets?workspaceSlug=${WORKSPACE_SLUG}`, {
        method: 'OPTIONS',
      });
      const data = await res.json();
      if (data.success) {
        setFilters(data.filters);
      }
    } catch (error) {
      console.error('Failed to fetch filters:', error);
    }
  };

  useEffect(() => {
    document.title = PAGE_TITLE;
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    fetchFilters();
  }, []);

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleAddToBoard = () => {
    setShowBoardSelect(true);
  };

  const handleBoardAddComplete = () => {
    toast.success(`${selectedIds.length}枚をボードに追加しました`);
    setSelectedIds([]);
  };

  const handleFilterChange = (key: string, value: string | string[] | undefined) => {
    setActiveFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="min-h-screen pt-20 px-6 pb-8">
      {/* Page Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl tracking-[4px] uppercase mb-2">LIBRARY</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              デザイン生成のための参照画像アーカイブ
            </p>
          </div>
          <div className="flex items-center gap-4">
            {selectedIds.length > 0 && (
              <button
                onClick={handleAddToBoard}
                className="btn-glow-amber px-4 py-2 text-xs tracking-[1px] uppercase"
              >
                ボードに追加 ({selectedIds.length})
              </button>
            )}
            <button
              onClick={() => setShowUpload(true)}
              className="btn-glow px-4 py-2 text-xs tracking-[1px] uppercase"
            >
              + アップロード
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Source Filter */}
          <select
            value={activeFilters.source || ''}
            onChange={(e) => handleFilterChange('source', e.target.value || undefined)}
            className="bg-[var(--background-card)] border border-[var(--text-inactive)] px-3 py-2 text-xs uppercase tracking-[1px]"
          >
            <option value="">すべてのソース</option>
            <option value="seed">シード</option>
            <option value="user_upload">ユーザーアップロード</option>
          </select>

          {/* Collection Filter */}
          {filters?.collections && filters.collections.length > 0 && (
            <select
              value={activeFilters.collection || ''}
              onChange={(e) => handleFilterChange('collection', e.target.value || undefined)}
              className="bg-[var(--background-card)] border border-[var(--text-inactive)] px-3 py-2 text-xs uppercase tracking-[1px]"
            >
              <option value="">すべてのコレクション</option>
              {filters.collections.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          {/* Silhouette Filter */}
          {filters?.silhouettes && filters.silhouettes.length > 0 && (
            <select
              value={activeFilters.silhouette || ''}
              onChange={(e) => handleFilterChange('silhouette', e.target.value || undefined)}
              className="bg-[var(--background-card)] border border-[var(--text-inactive)] px-3 py-2 text-xs uppercase tracking-[1px]"
            >
              <option value="">すべてのシルエット</option>
              {filters.silhouettes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}

          {/* Mood Filter */}
          {filters?.moods && filters.moods.length > 0 && (
            <select
              value={activeFilters.mood || ''}
              onChange={(e) => handleFilterChange('mood', e.target.value || undefined)}
              className="bg-[var(--background-card)] border border-[var(--text-inactive)] px-3 py-2 text-xs uppercase tracking-[1px]"
            >
              <option value="">すべてのムード</option>
              {filters.moods.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}

          {/* Clear Filters */}
          {Object.keys(activeFilters).some((k) => activeFilters[k as keyof typeof activeFilters]) && (
            <button
              onClick={() => setActiveFilters({})}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] tracking-[1px] uppercase"
            >
              フィルター解除
            </button>
          )}

          {/* Results Count */}
          <span className="text-xs text-[var(--text-inactive)] ml-auto">
            {assets.length}枚
          </span>
        </div>
      </div>

      {/* Image Grid */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="aspect-[3/4] skeleton" />
            ))}
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <svg
              className="w-16 h-16 text-[var(--text-inactive)] mb-4"
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
            <p className="text-[var(--text-secondary)] mb-4">画像が見つかりません</p>
            <button
              onClick={() => setShowUpload(true)}
              className="btn-glow px-4 py-2 text-xs tracking-[1px] uppercase"
            >
              画像をアップロード
            </button>
          </div>
        ) : (
          <ImageGrid
            images={assets}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            columns={4}
          />
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUpload}
        onClose={() => {
          setShowUpload(false);
          router.replace('/library');
        }}
        workspaceSlug={WORKSPACE_SLUG}
        onUploadComplete={() => {
          fetchAssets();
          fetchFilters();
        }}
      />

      {/* Board Select Modal */}
      <BoardSelectModal
        isOpen={showBoardSelect}
        onClose={() => setShowBoardSelect(false)}
        selectedAssetIds={selectedIds}
        onComplete={handleBoardAddComplete}
      />
    </div>
  );
}
