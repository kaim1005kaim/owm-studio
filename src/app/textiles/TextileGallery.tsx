'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import TextileCard, { TextileCardSkeleton } from '@/components/TextileCard';
import UploadModal from '@/components/UploadModal';
import { useToast } from '@/components/Toast';
import { useClient, useWorkspaceSlug, useContent } from '@/context/ClientContext';

interface TextileAsset {
  id: string;
  url: string;
  thumbUrl: string | null;
  title: string;
  artistName: string;
  collection?: string;
  caption?: string;
  tags?: string[];
}

export default function TextileGallery() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const client = useClient();
  const workspaceSlug = useWorkspaceSlug();
  const content = useContent();

  const [assets, setAssets] = useState<TextileAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(searchParams.get('upload') === 'true');
  const [artistFilter, setArtistFilter] = useState<string>('');
  const [artists, setArtists] = useState<string[]>([]);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ workspaceSlug });
      // Only fetch reference/textile assets
      params.append('source', 'seed,user_upload');

      const res = await fetch(`/api/assets?${params}`);
      const data = await res.json();

      if (data.success) {
        // Map assets to textile format with artist info from metadata
        const textileAssets: TextileAsset[] = data.assets.map((asset: {
          id: string;
          url: string;
          thumbUrl: string | null;
          title?: string;
          caption?: string;
          tags?: string[];
          metadata?: {
            artist_name?: string;
            textile_title?: string;
          };
          collection?: string;
        }) => ({
          id: asset.id,
          url: asset.url,
          thumbUrl: asset.thumbUrl,
          title: asset.metadata?.textile_title || asset.title || 'Untitled',
          artistName: asset.metadata?.artist_name || 'Unknown Artist',
          collection: asset.collection,
          caption: asset.caption,
          tags: asset.tags,
        }));

        setAssets(textileAssets);

        // Extract unique artist names for filter
        const uniqueArtists = [...new Set(textileAssets.map(a => a.artistName))].sort();
        setArtists(uniqueArtists);
      }
    } catch (error) {
      console.error('Failed to fetch textiles:', error);
      toast.error('テキスタイルの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [workspaceSlug, toast]);

  useEffect(() => {
    document.title = `${content.libraryTitle} - ${client.brandName}`;
  }, [content.libraryTitle, client.brandName]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Filter assets by artist
  const filteredAssets = artistFilter
    ? assets.filter(a => a.artistName === artistFilter)
    : assets;

  const handleSelect = (id: string) => {
    setSelectedId(id === selectedId ? null : id);
  };

  const handleProceed = () => {
    if (selectedId) {
      router.push(`/create?textile=${selectedId}`);
    }
  };

  const handleUploadComplete = () => {
    setShowUpload(false);
    fetchAssets();
    toast.success('テキスタイルをアップロードしました');
  };

  return (
    <div className="min-h-screen pt-20 px-6 pb-8">
      {/* Page Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl tracking-[4px] uppercase mb-2">
              {content.libraryTitle}
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {content.libraryDescription}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Artist Filter */}
            {artists.length > 1 && (
              <select
                value={artistFilter}
                onChange={(e) => setArtistFilter(e.target.value)}
                className="form-input text-sm py-2 px-4 min-w-[180px]"
              >
                <option value="">すべてのアーティスト</option>
                {artists.map((artist) => (
                  <option key={artist} value={artist}>
                    {artist}
                  </option>
                ))}
              </select>
            )}

            {/* Upload Button */}
            <button
              onClick={() => setShowUpload(true)}
              className="btn-glow px-4 py-2 text-xs tracking-[1px] uppercase"
            >
              + テキスタイル追加
            </button>
          </div>
        </div>
      </div>

      {/* Selected Textile Action Bar */}
      {selectedId && (
        <div className="fixed bottom-0 left-0 right-0 z-40 glass-card border-t border-[var(--text-inactive)]/20">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-[var(--text-secondary)]">
                テキスタイルを選択中
              </span>
              <button
                onClick={() => setSelectedId(null)}
                className="text-xs text-[var(--text-inactive)] hover:text-[var(--foreground)] transition-colors"
              >
                選択解除
              </button>
            </div>
            <button
              onClick={handleProceed}
              className="btn-primary px-6 py-2 text-sm tracking-[1px] uppercase"
            >
              デザインを作成 →
            </button>
          </div>
        </div>
      )}

      {/* Gallery Grid */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <TextileCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[var(--text-secondary)] mb-4">
              {artistFilter
                ? `${artistFilter}のテキスタイルが見つかりません`
                : 'テキスタイルがまだありません'}
            </p>
            <button
              onClick={() => setShowUpload(true)}
              className="btn-glow px-6 py-3 text-sm"
            >
              テキスタイルをアップロード
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-24">
            {filteredAssets.map((textile) => (
              <TextileCard
                key={textile.id}
                id={textile.id}
                imageUrl={textile.url}
                thumbUrl={textile.thumbUrl || undefined}
                title={textile.title}
                artistName={textile.artistName}
                collection={textile.collection}
                selected={textile.id === selectedId}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <UploadModal
          isOpen={showUpload}
          onClose={() => setShowUpload(false)}
          onUploadComplete={handleUploadComplete}
          workspaceSlug={workspaceSlug}
        />
      )}
    </div>
  );
}
