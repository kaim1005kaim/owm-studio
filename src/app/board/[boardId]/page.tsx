'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import ImageGrid from '@/components/ImageGrid';

const WORKSPACE_SLUG = 'maison_demo';

interface BoardAsset {
  id: string;
  position: number;
  url: string;
  thumbUrl: string | null;
  title?: string;
  status: string;
  annotation?: {
    caption?: string;
    tags?: string[];
    silhouette?: string;
    material?: string;
    mood?: string;
  };
}

interface Board {
  id: string;
  name: string;
  created_at: string;
  assets: BoardAsset[];
}

interface GenerationStats {
  totalGenerations: number;
  totalOutputs: number;
  detailViewCount: number;
}

export default function BoardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.boardId as string;

  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableAssets, setAvailableAssets] = useState<BoardAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [genStats, setGenStats] = useState<GenerationStats | null>(null);

  const fetchBoard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/boards?workspaceSlug=${WORKSPACE_SLUG}&boardId=${boardId}`);
      const data = await res.json();
      if (data.success) {
        setBoard(data.board);
      }
    } catch (error) {
      console.error('Failed to fetch board:', error);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  const fetchGenerationStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/generations?boardId=${boardId}`);
      const data = await res.json();
      if (data.success && data.generations) {
        let totalOutputs = 0;
        let detailViewCount = 0;
        for (const gen of data.generations) {
          totalOutputs += gen.outputs.length;
          for (const output of gen.outputs) {
            if (output.detailViews) {
              detailViewCount++;
            }
          }
        }
        setGenStats({
          totalGenerations: data.generations.length,
          totalOutputs,
          detailViewCount,
        });
      }
    } catch (error) {
      console.error('Failed to fetch generation stats:', error);
    }
  }, [boardId]);

  const fetchAvailableAssets = async () => {
    setLoadingAssets(true);
    try {
      const res = await fetch(`/api/assets?workspaceSlug=${WORKSPACE_SLUG}&limit=100`);
      const data = await res.json();
      if (data.success) {
        // Filter out assets already in board
        const boardAssetIds = board?.assets.map((a) => a.id) || [];
        const available = data.assets.filter((a: BoardAsset) => !boardAssetIds.includes(a.id));
        setAvailableAssets(available);
      }
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    } finally {
      setLoadingAssets(false);
    }
  };

  useEffect(() => {
    fetchBoard();
    fetchGenerationStats();
  }, [fetchBoard, fetchGenerationStats]);

  const handleRemoveFromBoard = async (assetId: string) => {
    try {
      await fetch('/api/boards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId,
          assetId,
          action: 'remove',
        }),
      });
      fetchBoard();
    } catch (error) {
      console.error('Failed to remove from board:', error);
    }
  };

  const handleAddToBoard = async (assetIds: string[]) => {
    for (const assetId of assetIds) {
      try {
        await fetch('/api/boards', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            boardId,
            assetId,
            action: 'add',
          }),
        });
      } catch (error) {
        console.error('Failed to add to board:', error);
      }
    }
    setShowAddModal(false);
    setSelectedAssets([]);
    fetchBoard();
  };

  const openAddModal = () => {
    setShowAddModal(true);
    fetchAvailableAssets();
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <p className="text-[var(--text-secondary)]">ボードが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 px-6 pb-8">
      {/* Page Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => router.push('/board')}
              className="text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] tracking-[1px] uppercase mb-2 flex items-center gap-2"
            >
              ← ボード一覧に戻る
            </button>
            <h1 className="text-2xl tracking-[4px] uppercase mb-2">{board.name}</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              参照画像 {board.assets.length} 枚
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={openAddModal}
              className="btn-glow px-4 py-2 text-xs tracking-[1px] uppercase"
            >
              + 画像を追加
            </button>
            {board.assets.length >= 3 && (
              <button
                onClick={() => router.push(`/generate/${board.id}`)}
                className="btn-primary px-6 py-2 text-xs tracking-[1px] uppercase"
              >
                {genStats && genStats.totalOutputs > 0
                  ? '生成結果を見る →'
                  : 'デザインを生成 →'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Generation Stats */}
      {genStats && genStats.totalOutputs > 0 && (
        <div className="max-w-7xl mx-auto mb-6">
          <div
            className="glass-card p-4 flex items-center justify-between cursor-pointer hover:border-[var(--accent-cyan)] transition-colors"
            onClick={() => router.push(`/generate/${board.id}`)}
          >
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-[var(--accent-cyan)]/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-[var(--accent-cyan)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm">
                  生成済みデザイン <span className="text-[var(--accent-cyan)] font-medium">{genStats.totalOutputs}案</span>
                  {genStats.detailViewCount > 0 && (
                    <span className="ml-3">
                      詳細ビュー <span className="text-[var(--accent-cyan)] font-medium">{genStats.detailViewCount}件</span>
                    </span>
                  )}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  クリックして生成結果を確認
                </p>
              </div>
            </div>
            <svg className="w-4 h-4 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      )}

      {/* Board Assets */}
      <div className="max-w-7xl mx-auto">
        {board.assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-[var(--text-secondary)] mb-4">
              デザイン生成には参照画像が3枚以上必要です
            </p>
            <button
              onClick={openAddModal}
              className="btn-glow px-4 py-2 text-xs tracking-[1px] uppercase"
            >
              画像を追加
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {board.assets.map((asset) => (
              <div key={asset.id} className="relative group">
                <div className="aspect-[3/4] relative overflow-hidden bg-[var(--background-card)]">
                  <Image
                    src={asset.thumbUrl || asset.url}
                    alt={asset.title || 'Reference'}
                    fill
                    className="object-cover"
                    sizes="25vw"
                  />

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    {asset.annotation?.caption && (
                      <p className="text-xs text-center px-4 line-clamp-2">
                        {asset.annotation.caption}
                      </p>
                    )}
                    <button
                      onClick={() => handleRemoveFromBoard(asset.id)}
                      className="text-[var(--accent-crimson)] text-xs hover:text-[var(--foreground)] tracking-[1px] uppercase"
                    >
                      削除
                    </button>
                  </div>
                </div>

                {/* Position Badge */}
                <div className="absolute top-2 left-2 w-6 h-6 bg-black/80 flex items-center justify-center text-xs">
                  {asset.position + 1}
                </div>

                {/* Tags */}
                {asset.annotation?.tags && asset.annotation.tags.length > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex flex-wrap gap-1">
                      {asset.annotation.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="tag-chip text-[8px]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Minimum Requirement Notice */}
      {board.assets.length > 0 && board.assets.length < 3 && (
        <div className="max-w-7xl mx-auto mt-6">
          <div className="glass-card p-4 flex items-center gap-4">
            <svg
              className="w-5 h-5 text-[var(--accent-amber)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <p className="text-sm text-[var(--text-secondary)]">
              あと<span className="text-[var(--accent-amber)]"> {3 - board.assets.length}枚</span>追加するとデザイン生成が可能になります
            </p>
          </div>
        </div>
      )}

      {/* Add Images Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative glass-card w-full max-w-4xl mx-4 p-6 fade-in max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg tracking-[2px] uppercase">参照画像を追加</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--foreground)]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              {loadingAssets ? (
                <div className="flex items-center justify-center h-64">
                  <div className="spinner" />
                </div>
              ) : availableAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <p className="text-[var(--text-secondary)] mb-4">
                    追加可能な画像がありません
                  </p>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      router.push('/library?upload=true');
                    }}
                    className="btn-glow px-4 py-2 text-xs tracking-[1px] uppercase"
                  >
                    画像をアップロード
                  </button>
                </div>
              ) : (
                <ImageGrid
                  images={availableAssets.map((a) => ({
                    id: a.id,
                    url: a.url,
                    thumbUrl: a.thumbUrl,
                    title: a.title,
                    tags: a.annotation?.tags,
                    caption: a.annotation?.caption,
                    silhouette: a.annotation?.silhouette,
                    material: a.annotation?.material,
                    mood: a.annotation?.mood,
                  }))}
                  selectedIds={selectedAssets}
                  onSelect={(id) =>
                    setSelectedAssets((prev) =>
                      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
                    )
                  }
                  columns={4}
                  showDetails={false}
                />
              )}
            </div>

            {selectedAssets.length > 0 && (
              <div className="mt-6 flex items-center justify-between pt-4 border-t border-[var(--text-inactive)]">
                <span className="text-sm text-[var(--text-secondary)]">
                  {selectedAssets.length}枚 選択中
                </span>
                <button
                  onClick={() => handleAddToBoard(selectedAssets)}
                  className="btn-primary px-6 py-2 text-xs tracking-[1px] uppercase"
                >
                  ボードに追加
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
