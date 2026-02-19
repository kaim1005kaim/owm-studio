'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import AdditionalReferencesUpload from '@/components/AdditionalReferencesUpload';
import CategoryGrid from '@/components/CategoryGrid';
import { useToast } from '@/components/Toast';
import {
  useClient,
  useWorkspaceSlug,
  useCategories,
  usePromptTemplates,
  useContent,
  useFeature,
} from '@/context/ClientContext';

interface TextileAsset {
  id: string;
  url: string;
  thumbUrl: string | null;
  title: string;
  artistName: string;
}

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
}

interface GeneratedOutput {
  id: string;
  assetId: string;
  url: string;
  detailViews?: {
    heroUrl?: string;
    garmentViews?: {
      frontUrl: string;
      sideUrl: string;
      backUrl: string;
      viewStyle: string;
    };
  } | null;
}

interface GenerationHistory {
  id: string;
  prompt: string;
  config: Record<string, unknown>;
  createdAt: string;
  textileId: string | null;
  artistName: string | null;
  textileTitle: string | null;
  category: string | null;
  outputs: GeneratedOutput[];
}

export default function CreateClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const client = useClient();
  const workspaceSlug = useWorkspaceSlug();
  const categories = useCategories();
  const promptTemplates = usePromptTemplates();
  const content = useContent();

  // State
  const [textile, setTextile] = useState<TextileAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [additionalRefs, setAdditionalRefs] = useState<UploadedFile[]>([]);
  const [prompt, setPrompt] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<GeneratedOutput[]>([]);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [generatingViews, setGeneratingViews] = useState<string | null>(null);  // assetId being processed
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [history, setHistory] = useState<GenerationHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedGeneration, setExpandedGeneration] = useState<string | null>(null);
  const hasViewGeneration = useFeature('viewGeneration');
  const aspectRatio = client.generation?.aspectRatio || '9:16';

  const textileId = searchParams.get('textile');

  // Lightbox helpers
  const openLightbox = (images: string[], startIndex: number = 0) => {
    setLightboxImages(images);
    setLightboxIndex(startIndex);
  };

  const closeLightbox = () => {
    setLightboxImages([]);
    setLightboxIndex(0);
  };

  const nextImage = () => {
    setLightboxIndex((prev) => (prev + 1) % lightboxImages.length);
  };

  const prevImage = () => {
    setLightboxIndex((prev) => (prev - 1 + lightboxImages.length) % lightboxImages.length);
  };

  // Build image array for output with detail views
  const getOutputImages = (output: GeneratedOutput): string[] => {
    const images: string[] = [output.url];
    if (output.detailViews?.heroUrl) {
      images.push(output.detailViews.heroUrl);
    }
    if (output.detailViews?.garmentViews) {
      const { frontUrl, sideUrl, backUrl } = output.detailViews.garmentViews;
      if (frontUrl) images.push(frontUrl);
      if (sideUrl) images.push(sideUrl);
      if (backUrl) images.push(backUrl);
    }
    return images;
  };

  // Fetch textile asset
  const fetchTextile = useCallback(async () => {
    if (!textileId) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/assets/${textileId}?workspaceSlug=${workspaceSlug}`);
      const data = await res.json();

      if (data.success && data.asset) {
        setTextile({
          id: data.asset.id,
          url: data.asset.url,
          thumbUrl: data.asset.thumbUrl,
          title: data.asset.metadata?.textile_title || data.asset.title || 'Untitled',
          artistName: data.asset.metadata?.artist_name || 'Unknown Artist',
        });
      }
    } catch (error) {
      console.error('Failed to fetch textile:', error);
      toast.error('テキスタイルの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [textileId, workspaceSlug, toast]);

  useEffect(() => {
    document.title = `${content.generateTitle} - ${client.brandName}`;
  }, [content.generateTitle, client.brandName]);

  useEffect(() => {
    fetchTextile();
  }, [fetchTextile]);

  // Fetch generation history
  const fetchHistory = useCallback(async () => {
    if (!textileId) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/generations?workspaceSlug=${workspaceSlug}&textileId=${textileId}`);
      const data = await res.json();
      if (data.success) {
        setHistory(data.generations || []);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setHistoryLoading(false);
    }
  }, [textileId, workspaceSlug]);

  // Fetch history when switching to history tab
  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    const template = promptTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setPrompt(template.prompt);
    }
  };

  // Handle generation
  const handleGenerate = async () => {
    if (!textile || !selectedCategory) {
      toast.error('テキスタイルとカテゴリを選択してください');
      return;
    }

    setGenerating(true);
    setOutputs([]);

    try {
      // Prepare additional references as base64
      const additionalImages: { base64: string; mimeType: string }[] = [];
      for (const ref of additionalRefs) {
        const base64 = await fileToBase64(ref.file);
        additionalImages.push({
          base64,
          mimeType: ref.file.type,
        });
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceSlug,
          textileId: textile.id,
          prompt: prompt || 'ファッションデザイン',
          count: 4,
          category: selectedCategory,
          aspectRatio,
          additionalReferences: additionalImages,
          artistName: textile.artistName,
          textileTitle: textile.title,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setOutputs(data.outputs || []);
        toast.success('デザインを生成しました');
        // Refresh history in background
        fetchHistory();
      } else {
        throw new Error(data.error || 'Generation failed');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('生成に失敗しました');
    } finally {
      setGenerating(false);
    }
  };

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Download handler
  const handleDownload = async (url: string, filename?: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || `design-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast.error('ダウンロードに失敗しました');
    }
  };

  // Generate 3-view (ghost mannequin or flat lay)
  const handleGenerateViews = async (assetId: string, viewStyle: 'ghost' | 'flatlay') => {
    setGeneratingViews(assetId);
    try {
      const res = await fetch('/api/generate-views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceSlug,
          assetId,
          viewStyle,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('3面図を生成しました');
        // Refresh history to show new 3-view results
        fetchHistory();
      } else {
        throw new Error(data.error || 'View generation failed');
      }
    } catch (error) {
      console.error('View generation error:', error);
      toast.error('3面図の生成に失敗しました');
    } finally {
      setGeneratingViews(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!textile) {
    return (
      <div className="min-h-screen pt-20 px-6 pb-8">
        <div className="max-w-4xl mx-auto text-center py-20">
          <h1 className="text-xl mb-4">テキスタイルが選択されていません</h1>
          <p className="text-[var(--text-secondary)] mb-8">
            まずギャラリーからテキスタイルを選択してください
          </p>
          <Link
            href="/textiles"
            className="btn-primary px-6 py-3 inline-block"
          >
            テキスタイルギャラリーへ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 px-6 pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Link */}
        <Link
          href="/textiles"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--foreground)] transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          ギャラリーに戻る
        </Link>

        {/* Main Content */}
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left Column - Selected Textile */}
          <div className="lg:col-span-2">
            <div className="sticky top-24">
              <div className="textile-card overflow-hidden rounded">
                <div className="relative aspect-square">
                  <Image
                    src={textile.url}
                    alt={textile.title}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
                <div className="p-4">
                  <p className="artist-name mb-1">{textile.artistName}</p>
                  <h2 className="textile-title text-lg">{textile.title}</h2>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Controls */}
          <div className="lg:col-span-3 space-y-8">
            {/* Additional References */}
            <AdditionalReferencesUpload
              maxFiles={5}
              currentFiles={additionalRefs}
              onFilesChange={setAdditionalRefs}
            />

            {/* Design Direction */}
            <div className="space-y-3">
              <label className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">
                デザインの方向性
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="シルエット、スタイル、雰囲気などを指定..."
                rows={3}
                className="form-input w-full resize-none"
              />

              {/* Prompt Templates */}
              <div className="flex flex-wrap gap-2">
                {promptTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template.id)}
                    className={`px-3 py-1.5 text-xs rounded transition-colors ${
                      selectedTemplate === template.id
                        ? 'bg-[var(--foreground)] text-[var(--background)]'
                        : 'border border-[var(--text-inactive)]/50 hover:border-[var(--foreground)]'
                    }`}
                  >
                    {template.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Selection */}
            <CategoryGrid
              categories={categories}
              selectedId={selectedCategory}
              onSelect={setSelectedCategory}
            />

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={generating || !selectedCategory}
              className={`w-full py-4 text-sm tracking-[2px] uppercase font-medium transition-all ${
                generating || !selectedCategory
                  ? 'bg-[var(--text-inactive)] text-[var(--background)] cursor-not-allowed'
                  : 'btn-primary'
              }`}
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="spinner w-4 h-4" />
                  生成中...
                </span>
              ) : (
                'CREATE'
              )}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-12 border-b border-[var(--text-inactive)]/20">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('create')}
              className={`pb-3 text-sm tracking-[1px] uppercase transition-colors ${
                activeTab === 'create'
                  ? 'text-[var(--foreground)] border-b-2 border-[var(--foreground)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
              }`}
            >
              生成結果
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-3 text-sm tracking-[1px] uppercase transition-colors ${
                activeTab === 'history'
                  ? 'text-[var(--foreground)] border-b-2 border-[var(--foreground)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--foreground)]'
              }`}
            >
              履歴
            </button>
          </div>
        </div>

        {/* Generated Results (Create Tab) */}
        {activeTab === 'create' && outputs.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg tracking-[2px] uppercase mb-6">生成結果</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {outputs.map((output) => (
                <div
                  key={output.id}
                  className="group relative aspect-[9/16] rounded overflow-hidden cursor-pointer"
                  onClick={() => openLightbox(getOutputImages(output), 0)}
                >
                  <Image
                    src={output.url}
                    alt="Generated design"
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Hover Actions */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors">
                    <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity space-y-2">
                      {/* 3-View Generation Buttons */}
                      {hasViewGeneration && (
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerateViews(output.assetId, 'ghost');
                            }}
                            disabled={generatingViews === output.assetId}
                            className="flex-1 py-2 bg-white/90 text-black text-xs rounded hover:bg-white transition-colors disabled:opacity-50"
                          >
                            {generatingViews === output.assetId ? '生成中...' : 'ゴースト'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerateViews(output.assetId, 'flatlay');
                            }}
                            disabled={generatingViews === output.assetId}
                            className="flex-1 py-2 bg-white/90 text-black text-xs rounded hover:bg-white transition-colors disabled:opacity-50"
                          >
                            {generatingViews === output.assetId ? '生成中...' : '平置き'}
                          </button>
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(output.url);
                        }}
                        className="w-full py-2 bg-white/90 text-black text-xs rounded hover:bg-white transition-colors"
                      >
                        ダウンロード
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generating Placeholder (Create Tab) */}
        {activeTab === 'create' && generating && outputs.length === 0 && (
          <div className="mt-8">
            <h3 className="text-lg tracking-[2px] uppercase mb-6">生成中...</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-[9/16] skeleton rounded" />
              ))}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="mt-8">
            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="spinner" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12 text-[var(--text-secondary)]">
                <p>このテキスタイルの生成履歴はまだありません</p>
              </div>
            ) : (
              <div className="space-y-6">
                {history.map((gen) => (
                  <div
                    key={gen.id}
                    className="border border-[var(--text-inactive)]/20 rounded-lg overflow-hidden"
                  >
                    {/* Generation Header */}
                    <button
                      onClick={() => setExpandedGeneration(expandedGeneration === gen.id ? null : gen.id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-[var(--card-bg)] transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-left">
                          <p className="text-sm font-medium">
                            {gen.category || 'デザイン'} × {gen.outputs.length}枚
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] mt-1">
                            {new Date(gen.createdAt).toLocaleString('ja-JP')}
                          </p>
                        </div>
                      </div>
                      <svg
                        className={`w-5 h-5 transition-transform ${expandedGeneration === gen.id ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Expanded Content */}
                    {expandedGeneration === gen.id && (
                      <div className="p-4 border-t border-[var(--text-inactive)]/20 space-y-4">
                        {/* Prompt */}
                        <div>
                          <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wider mb-1">プロンプト</p>
                          <p className="text-sm">{gen.prompt}</p>
                        </div>

                        {/* Outputs Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {gen.outputs.map((output) => {
                            const outputImages = getOutputImages(output);
                            return (
                            <div key={output.id} className="space-y-2">
                              {/* Main Output */}
                              <div
                                className="relative aspect-[9/16] rounded overflow-hidden cursor-pointer group"
                                onClick={() => openLightbox(outputImages, 0)}
                              >
                                <Image
                                  src={output.url}
                                  alt="Generated design"
                                  fill
                                  className="object-cover"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                              </div>

                              {/* 3-View Results */}
                              {output.detailViews?.garmentViews && (
                                <div className="space-y-1">
                                  <p className="text-xs text-[var(--text-secondary)]">
                                    3面図 ({output.detailViews.garmentViews.viewStyle === 'ghost' ? 'ゴースト' : '平置き'})
                                  </p>
                                  <div className="grid grid-cols-3 gap-1">
                                    {['frontUrl', 'sideUrl', 'backUrl'].map((view, viewIndex) => {
                                      const url = output.detailViews?.garmentViews?.[view as 'frontUrl' | 'sideUrl' | 'backUrl'];
                                      if (!url) return null;
                                      // Calculate index: 1 (main) + 1 (hero if exists) + viewIndex
                                      const imageIndex = 1 + (output.detailViews?.heroUrl ? 1 : 0) + viewIndex;
                                      return (
                                        <div
                                          key={view}
                                          className="relative aspect-square rounded overflow-hidden cursor-pointer"
                                          onClick={() => openLightbox(outputImages, imageIndex)}
                                        >
                                          <Image
                                            src={url}
                                            alt={view.replace('Url', '')}
                                            fill
                                            className="object-cover"
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Generate 3-View Button (if not yet generated) */}
                              {hasViewGeneration && !output.detailViews?.garmentViews && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleGenerateViews(output.assetId, 'ghost')}
                                    disabled={generatingViews === output.assetId}
                                    className="flex-1 py-1 text-xs border border-[var(--text-inactive)]/30 rounded hover:border-[var(--foreground)] transition-colors disabled:opacity-50"
                                  >
                                    {generatingViews === output.assetId ? '...' : 'ゴースト'}
                                  </button>
                                  <button
                                    onClick={() => handleGenerateViews(output.assetId, 'flatlay')}
                                    disabled={generatingViews === output.assetId}
                                    className="flex-1 py-1 text-xs border border-[var(--text-inactive)]/30 rounded hover:border-[var(--foreground)] transition-colors disabled:opacity-50"
                                  >
                                    {generatingViews === output.assetId ? '...' : '平置き'}
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox with Carousel */}
      {lightboxImages.length > 0 && (
        <div
          className="fixed inset-0 z-50 modal-backdrop flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white/80 hover:text-white z-10"
          >
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Previous Button */}
          {lightboxImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white z-10 p-2"
            >
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Next Button */}
          {lightboxImages.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white z-10 p-2"
            >
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Image */}
          <div
            className="relative max-w-4xl max-h-[90vh] w-full aspect-[9/16]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={lightboxImages[lightboxIndex]}
              alt={`Image ${lightboxIndex + 1} of ${lightboxImages.length}`}
              fill
              className="object-contain"
            />
          </div>

          {/* Indicator */}
          {lightboxImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {lightboxImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex(idx);
                  }}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === lightboxIndex ? 'bg-white' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
