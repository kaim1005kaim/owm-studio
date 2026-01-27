'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';

const WORKSPACE_SLUG = 'maison_demo';

interface BoardAsset {
  id: string;
  url: string;
  thumbUrl: string | null;
}

interface Board {
  id: string;
  name: string;
  assets: BoardAsset[];
}

interface GeneratedOutput {
  id: string;
  assetId: string;
  url: string;
  liked?: boolean;
  score?: number;
  detailViews?: DetailViewResult | null;
}

interface EditHistory {
  id: string;
  assetId: string;
  url: string;
  instruction: string;
  createdAt: string;
}

interface DetailViewResult {
  heroAssetId?: string;
  heroUrl: string;
  garmentViews: {
    frontAssetId?: string;
    frontUrl: string;
    sideAssetId?: string;
    sideUrl: string;
    backAssetId?: string;
    backUrl: string;
    viewStyle?: string;
  } | null;
}

interface GenerationRecord {
  id: string;
  prompt: string;
  config: {
    count: number;
    aspectRatio: string;
    imageSize: string;
    category?: string;
  };
  createdAt: string;
  outputs: GeneratedOutput[];
}

type GarmentCategory =
  | 'coat'
  | 'blouson'
  | 'jacket'
  | 'vest'
  | 'shirt'
  | 'knit'
  | 'pants'
  | 'skirt'
  | 'onepiece';

type ViewStyle = 'ghost' | 'flatlay';
type GenderTarget = 'mens' | 'ladies' | 'unisex';

const GENDER_TABS: { value: GenderTarget; label: string }[] = [
  { value: 'mens', label: 'メンズ' },
  { value: 'ladies', label: 'レディース' },
  { value: 'unisex', label: 'ユニセックス' },
];

const GARMENT_CATEGORIES: { value: GarmentCategory; label: string }[] = [
  { value: 'coat', label: 'コート' },
  { value: 'blouson', label: 'ブルゾン' },
  { value: 'jacket', label: 'ジャケット' },
  { value: 'vest', label: 'ベスト' },
  { value: 'shirt', label: 'シャツ' },
  { value: 'knit', label: 'ニット' },
  { value: 'pants', label: 'パンツ' },
  { value: 'skirt', label: 'スカート' },
  { value: 'onepiece', label: 'ワンピース' },
];

const PROMPT_TEMPLATES = [
  { label: 'Tech', prompt: 'Technical fabric, functional details, urban utility aesthetic' },
  { label: 'Mode', prompt: 'High fashion, editorial quality, avant-garde silhouettes' },
  { label: 'Street', prompt: 'Streetwear aesthetic, oversized fit, graphic elements' },
  { label: 'Minimal', prompt: 'Clean lines, monochrome palette, architectural shapes' },
  { label: 'Classic', prompt: 'Timeless elegance, tailored fit, sophisticated details' },
];

const EDIT_PRESETS = [
  { label: '丈 -8cm', instruction: '丈を8cm短くしてください' },
  { label: '丈 +8cm', instruction: '丈を8cm長くしてください' },
  { label: '襟を立てる', instruction: '襟を立ち襟にしてください' },
  { label: 'ナイロン素材', instruction: '素材をテックナイロンに変更してください' },
  { label: 'ウール素材', instruction: '素材をウールツイードに変更してください' },
  { label: 'レザー素材', instruction: '素材をレザーに変更してください' },
  { label: 'モノトーン', instruction: '配色をモノトーン（白黒グレー）に変更してください' },
  { label: 'ポケット追加', instruction: 'ユーティリティポケットを追加してください' },
  { label: 'オーバーサイズ', instruction: 'シルエットをオーバーサイズに変更してください' },
];

export default function GeneratePage() {
  const params = useParams();
  const router = useRouter();
  const boardId = params.boardId as string;

  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [count, setCount] = useState<4 | 8 | 12>(4);
  const [gender, setGender] = useState<GenderTarget>('mens');
  const [category, setCategory] = useState<GarmentCategory | ''>('');
  const [outputs, setOutputs] = useState<GeneratedOutput[]>([]);
  const [generationHistory, setGenerationHistory] = useState<GenerationRecord[]>([]);
  const [inspiration, setInspiration] = useState('');
  const [selectedOutputs, setSelectedOutputs] = useState<string[]>([]);

  // Edit drawer state
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<{ assetId: string; url: string } | null>(null);
  const [editInstruction, setEditInstruction] = useState('');
  const [editing, setEditing] = useState(false);
  const [editHistory, setEditHistory] = useState<EditHistory[]>([]);

  // Detail view drawer state
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [detailAsset, setDetailAsset] = useState<{ assetId: string; url: string } | null>(null);
  const [viewStyle, setViewStyle] = useState<ViewStyle>('ghost');
  const [generatingViews, setGeneratingViews] = useState(false);
  const [detailResult, setDetailResult] = useState<DetailViewResult | null>(null);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

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

  // Fetch generation history for this board
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/generations?boardId=${boardId}`);
      const data = await res.json();
      if (data.success && data.generations) {
        setGenerationHistory(data.generations);
        // Flatten all outputs from history into the outputs array
        const allOutputs: GeneratedOutput[] = [];
        for (const gen of data.generations) {
          for (const output of gen.outputs) {
            allOutputs.push(output);
          }
        }
        setOutputs(allOutputs);
      }
    } catch (error) {
      console.error('Failed to fetch generation history:', error);
    }
  }, [boardId]);

  useEffect(() => {
    fetchBoard();
    fetchHistory();
  }, [fetchBoard, fetchHistory]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setGenerating(true);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceSlug: WORKSPACE_SLUG,
          boardId,
          prompt: `[ターゲット: ${gender === 'mens' ? 'メンズ' : gender === 'ladies' ? 'レディース' : 'ユニセックス'}]\n${prompt.trim()}`,
          count,
          aspectRatio: '4:5',
          imageSize: '2K',
          ...(category && { category }),
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Prepend new outputs to existing
        const newOutputs: GeneratedOutput[] = data.outputs.map((o: GeneratedOutput) => ({
          ...o,
          detailViews: null,
        }));
        setOutputs((prev) => [...newOutputs, ...prev]);
        setInspiration(data.inspiration || '');
      } else {
        alert(data.error || '生成に失敗しました');
      }
    } catch (error) {
      console.error('Generation error:', error);
      alert('生成に失敗しました');
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectOutput = (id: string) => {
    setSelectedOutputs((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Open edit drawer (REMIX)
  const handleOpenEdit = (assetId: string, url: string) => {
    setEditingAsset({ assetId, url });
    setEditDrawerOpen(true);
    setEditInstruction('');
    setEditHistory([]);
  };

  // Close edit drawer
  const handleCloseEdit = () => {
    setEditDrawerOpen(false);
    setEditingAsset(null);
    setEditInstruction('');
  };

  // Apply edit (REMIX)
  const handleApplyEdit = async (instruction: string) => {
    if (!instruction.trim() || !editingAsset) return;

    setEditing(true);
    try {
      const res = await fetch('/api/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceSlug: WORKSPACE_SLUG,
          parentAssetId: editingAsset.assetId,
          instruction,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setEditHistory((prev) => [
          {
            id: data.editId,
            assetId: data.childAssetId,
            url: data.url,
            instruction,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);

        setEditingAsset({ assetId: data.childAssetId, url: data.url });

        setOutputs((prev) => [
          {
            id: data.editId,
            assetId: data.childAssetId,
            url: data.url,
          },
          ...prev,
        ]);

        setEditInstruction('');
      } else {
        alert(data.error || '再編集に失敗しました');
      }
    } catch (error) {
      console.error('Edit error:', error);
      alert('再編集に失敗しました');
    } finally {
      setEditing(false);
    }
  };

  // Select from edit history
  const handleSelectFromHistory = (item: EditHistory) => {
    setEditingAsset({ assetId: item.assetId, url: item.url });
  };

  // Open detail view drawer
  const handleOpenDetailView = (assetId: string, url: string) => {
    // Check if this output already has detail views from history
    const existingOutput = outputs.find((o) => o.assetId === assetId);
    if (existingOutput?.detailViews) {
      setDetailResult(existingOutput.detailViews);
    } else {
      setDetailResult(null);
    }
    setDetailAsset({ assetId, url });
    setDetailDrawerOpen(true);
    setViewStyle('ghost');
  };

  // Close detail view drawer
  const handleCloseDetailView = () => {
    setDetailDrawerOpen(false);
    setDetailAsset(null);
    setDetailResult(null);
  };

  // Generate detail views (着用ルック + garment 3-view)
  const handleGenerateViews = async () => {
    if (!detailAsset) return;

    setGeneratingViews(true);
    try {
      const res = await fetch('/api/generate-views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceSlug: WORKSPACE_SLUG,
          assetId: detailAsset.assetId,
          viewStyle,
        }),
      });

      const data = await res.json();
      if (data.success) {
        const result: DetailViewResult = {
          heroAssetId: data.heroAssetId,
          heroUrl: data.heroUrl,
          garmentViews: data.garmentViews,
        };
        setDetailResult(result);
        // Update the output's detailViews so it persists in local state
        setOutputs((prev) =>
          prev.map((o) =>
            o.assetId === detailAsset.assetId
              ? { ...o, detailViews: result }
              : o
          )
        );
      } else {
        alert(data.error || '詳細ビュー生成に失敗しました');
      }
    } catch (error) {
      console.error('Detail generation error:', error);
      alert('詳細ビュー生成に失敗しました');
    } finally {
      setGeneratingViews(false);
    }
  };

  // Build lightbox image list from detail view
  const lightboxImages = useMemo(() => {
    const imgs: { url: string; label: string }[] = [];
    if (detailAsset) {
      imgs.push({ url: detailAsset.url, label: '元デザイン' });
    }
    if (detailResult) {
      if (detailResult.heroUrl) {
        imgs.push({ url: detailResult.heroUrl, label: '着用ルック' });
      }
      if (detailResult.garmentViews) {
        imgs.push({ url: detailResult.garmentViews.frontUrl, label: 'FRONT' });
        imgs.push({
          url: detailResult.garmentViews.sideUrl,
          label: viewStyle === 'ghost' ? 'SIDE' : 'DETAIL',
        });
        imgs.push({ url: detailResult.garmentViews.backUrl, label: 'BACK' });
      }
    }
    return imgs;
  }, [detailAsset, detailResult, viewStyle]);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const lightboxPrev = () => {
    setLightboxIndex((prev) =>
      prev > 0 ? prev - 1 : lightboxImages.length - 1
    );
  };

  const lightboxNext = () => {
    setLightboxIndex((prev) =>
      prev < lightboxImages.length - 1 ? prev + 1 : 0
    );
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowLeft') lightboxPrev();
      if (e.key === 'ArrowRight') lightboxNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen, lightboxImages.length]);

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!board || board.assets.length < 3) {
    return (
      <div className="min-h-screen pt-20 flex flex-col items-center justify-center">
        <p className="text-[var(--text-secondary)] mb-4">
          ボードには最低3枚のリファレンス画像が必要です
        </p>
        <button
          onClick={() => router.push(`/board/${boardId}`)}
          className="btn-glow px-4 py-2 text-xs tracking-[1px] uppercase"
        >
          ボードに戻る
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 px-6 pb-8">
      {/* Page Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <button
          onClick={() => router.push(`/board/${boardId}`)}
          className="text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)] tracking-[1px] uppercase mb-2 flex items-center gap-2"
        >
          &larr; {board.name} に戻る
        </button>
        <h1 className="text-2xl tracking-[4px] uppercase mb-2">GENERATE</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          リファレンス画像をもとに新しいデザインバリエーションを生成します
        </p>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-3 gap-8">
        {/* Left Column - Reference & Controls */}
        <div className="col-span-1 space-y-6">
          {/* Reference Preview */}
          <div className="glass-card p-4">
            <h3 className="text-xs tracking-[2px] uppercase text-[var(--text-secondary)] mb-4">
              リファレンス画像 ({board.assets.length})
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {board.assets.slice(0, 8).map((asset) => (
                <div key={asset.id} className="aspect-square relative overflow-hidden bg-[var(--background)]">
                  <Image
                    src={asset.thumbUrl || asset.url}
                    alt="Reference"
                    fill
                    className="object-cover"
                    sizes="50px"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Prompt Input */}
          <div className="glass-card p-4">
            <h3 className="text-xs tracking-[2px] uppercase text-[var(--text-secondary)] mb-4">
              デザイン指示
            </h3>

            {/* Gender Tabs */}
            <div className="mb-4">
              <label className="text-xs text-[var(--text-secondary)] mb-2 block">
                ターゲット
              </label>
              <div className="grid grid-cols-3 gap-0 border border-[var(--text-inactive)]">
                {GENDER_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setGender(tab.value)}
                    className={`py-2 text-xs tracking-[1px] uppercase transition-colors ${
                      gender === tab.value
                        ? 'bg-[var(--accent-cyan)] text-black font-medium'
                        : 'bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Selector */}
            <div className="mb-4">
              <label className="text-xs text-[var(--text-secondary)] mb-2 block">
                MD カテゴリー
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as GarmentCategory | '')}
                className="w-full bg-[var(--background)] border border-[var(--text-inactive)] px-4 py-2 text-sm focus:border-[var(--accent-cyan)] outline-none appearance-none cursor-pointer"
              >
                <option value="">すべてのカテゴリー</option>
                {GARMENT_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="デザインの方向性を記述してください..."
              rows={4}
              className="w-full bg-[var(--background)] border border-[var(--text-inactive)] px-4 py-3 text-sm focus:border-[var(--accent-cyan)] outline-none resize-none mb-4"
            />

            {/* Template Buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              {PROMPT_TEMPLATES.map((template) => (
                <button
                  key={template.label}
                  onClick={() => setPrompt(template.prompt)}
                  className="tag-chip hover:bg-[var(--accent-cyan)]/20"
                >
                  {template.label}
                </button>
              ))}
            </div>

            {/* Count Selection */}
            <div className="flex items-center gap-4 mb-4">
              <span className="text-xs text-[var(--text-secondary)]">生成枚数:</span>
              {([4, 8, 12] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCount(c)}
                  className={`px-3 py-1 text-xs ${
                    count === c
                      ? 'bg-[var(--accent-cyan)] text-black'
                      : 'bg-[var(--background)] border border-[var(--text-inactive)]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || generating}
              className="w-full btn-primary py-3 text-sm tracking-[1px] uppercase disabled:opacity-50"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="spinner w-4 h-4" />
                  生成中...
                </span>
              ) : (
                `${count}案 生成する`
              )}
            </button>
          </div>

          {/* Inspiration */}
          {inspiration && (
            <div className="glass-card p-4">
              <h3 className="text-xs tracking-[2px] uppercase text-[var(--text-secondary)] mb-2">
                AI インスピレーション
              </h3>
              <p className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap">
                {inspiration}
              </p>
            </div>
          )}
        </div>

        {/* Right Column - Generated Results */}
        <div className="col-span-2">
          {generating ? (
            <div className="flex flex-col items-center justify-center h-96">
              <div className="spinner mb-4" />
              <p className="text-sm text-[var(--text-secondary)] breathing">
                {count}案のデザインバリエーションを生成中...
              </p>
              <p className="text-xs text-[var(--text-inactive)] mt-2">
                生成には数分かかります
              </p>
            </div>
          ) : outputs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-center">
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <p className="text-[var(--text-secondary)]">
                デザインの方向性を入力して生成してください
              </p>
              <p className="text-xs text-[var(--text-inactive)] mt-2">
                リファレンス画像をもとにAIが新しいデザイン案を提案します
              </p>
            </div>
          ) : (
            <>
              {/* Actions Bar */}
              {selectedOutputs.length > 0 && (
                <div className="mb-4 flex items-center justify-between glass-card p-3">
                  <span className="text-sm text-[var(--text-secondary)]">
                    {selectedOutputs.length}件選択中
                  </span>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setSelectedOutputs([])}
                      className="text-xs text-[var(--text-secondary)] hover:text-[var(--foreground)]"
                    >
                      解除
                    </button>
                    <button className="btn-glow-amber px-4 py-2 text-xs tracking-[1px] uppercase">
                      エクスポート
                    </button>
                  </div>
                </div>
              )}

              {/* Results Grid */}
              <div className="grid grid-cols-4 gap-4">
                {outputs.map((output) => (
                  <div
                    key={output.id}
                    className={`relative group cursor-pointer ${
                      selectedOutputs.includes(output.id)
                        ? 'ring-2 ring-[var(--accent-cyan)]'
                        : ''
                    }`}
                    onClick={() => handleSelectOutput(output.id)}
                  >
                    <div className="aspect-[4/5] relative overflow-hidden bg-[var(--background-card)]">
                      <Image
                        src={output.url}
                        alt="生成デザイン"
                        fill
                        className="object-cover image-hover"
                        sizes="25vw"
                      />

                      {/* Detail views indicator */}
                      {output.detailViews && (
                        <div className="absolute top-2 left-2 bg-[var(--accent-amber)]/80 px-1.5 py-0.5 text-[10px] text-black font-medium tracking-wide">
                          詳細あり
                        </div>
                      )}

                      {/* Selection Indicator */}
                      {selectedOutputs.includes(output.id) && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-[var(--accent-cyan)] flex items-center justify-center">
                          <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}

                      {/* Hover Actions */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetailView(output.assetId, output.url);
                          }}
                          className="btn-glow-amber px-4 py-1.5 text-xs w-32 text-center"
                        >
                          詳細ビュー
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(output.assetId, output.url);
                          }}
                          className="btn-glow px-4 py-1.5 text-xs w-32 text-center"
                        >
                          画像を再編集
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Results Summary */}
              <div className="mt-6 text-center">
                <p className="text-sm text-[var(--text-secondary)]">
                  {outputs.length}件のデザインが生成されました
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* REMIX Drawer */}
      {editDrawerOpen && editingAsset && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70"
            onClick={handleCloseEdit}
          />

          {/* Drawer */}
          <div className="absolute right-0 top-0 h-full w-[500px] bg-[var(--background)] border-l border-[var(--text-inactive)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--text-inactive)]">
              <h2 className="text-sm tracking-[2px] uppercase">画像を再編集</h2>
              <button
                onClick={handleCloseEdit}
                className="text-[var(--text-secondary)] hover:text-[var(--foreground)]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Current Image */}
              <div className="aspect-[4/5] relative overflow-hidden bg-[var(--background-card)]">
                <Image
                  src={editingAsset.url}
                  alt="現在のデザイン"
                  fill
                  className="object-contain"
                  sizes="500px"
                />
                {editing && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                    <div className="spinner mb-4" />
                    <p className="text-sm breathing">再編集を適用中...</p>
                  </div>
                )}
              </div>

              {/* Custom Instruction */}
              <div className="glass-card p-4">
                <h3 className="text-xs tracking-[2px] uppercase text-[var(--text-secondary)] mb-3">
                  変更指示
                </h3>
                <p className="text-xs text-[var(--text-inactive)] mb-2">
                  デザインの一部を変更する指示を入力してください
                </p>
                <textarea
                  value={editInstruction}
                  onChange={(e) => setEditInstruction(e.target.value)}
                  placeholder="例: 袖を短くする、色を黒に変更、素材をレザーに..."
                  rows={3}
                  className="w-full bg-[var(--background)] border border-[var(--text-inactive)] px-4 py-3 text-sm focus:border-[var(--accent-cyan)] outline-none resize-none mb-3"
                  disabled={editing}
                />
                <button
                  onClick={() => handleApplyEdit(editInstruction)}
                  disabled={!editInstruction.trim() || editing}
                  className="w-full btn-primary py-2 text-xs tracking-[1px] uppercase disabled:opacity-50"
                >
                  再編集を適用
                </button>
              </div>

              {/* Quick Edit Presets */}
              <div className="glass-card p-4">
                <h3 className="text-xs tracking-[2px] uppercase text-[var(--text-secondary)] mb-3">
                  クイック再編集
                </h3>
                <p className="text-xs text-[var(--text-inactive)] mb-2">
                  ワンタップで素早く変更を適用できます
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {EDIT_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => handleApplyEdit(preset.instruction)}
                      disabled={editing}
                      className="btn-glow px-2 py-2 text-xs disabled:opacity-50"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Edit History */}
              {editHistory.length > 0 && (
                <div className="glass-card p-4">
                  <h3 className="text-xs tracking-[2px] uppercase text-[var(--text-secondary)] mb-3">
                    再編集履歴 ({editHistory.length})
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {editHistory.map((item, index) => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 p-2 cursor-pointer hover:bg-[var(--background)] ${
                          item.assetId === editingAsset.assetId
                            ? 'border border-[var(--accent-cyan)]'
                            : ''
                        }`}
                        onClick={() => handleSelectFromHistory(item)}
                      >
                        <div className="w-10 h-10 relative flex-shrink-0 bg-[var(--background)]">
                          <Image
                            src={item.url}
                            alt={`再編集 ${index + 1}`}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        </div>
                        <p className="text-xs line-clamp-2 flex-1">{item.instruction}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--text-inactive)]">
              <button
                onClick={handleCloseEdit}
                className="w-full btn-glow py-2 text-xs tracking-[1px] uppercase"
              >
                完了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxOpen && lightboxImages.length > 0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/90"
            onClick={() => setLightboxOpen(false)}
          />

          {/* Image Label */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
            <span className="text-sm tracking-[2px] uppercase text-white/80">
              {lightboxImages[lightboxIndex]?.label}
            </span>
            <span className="text-xs text-white/50 ml-3">
              {lightboxIndex + 1} / {lightboxImages.length}
            </span>
          </div>

          {/* Close Button */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-6 right-6 z-10 text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Previous Button */}
          <button
            onClick={(e) => { e.stopPropagation(); lightboxPrev(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Next Button */}
          <button
            onClick={(e) => { e.stopPropagation(); lightboxNext(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Main Image */}
          <div className="relative w-[85vw] h-[85vh] max-w-[1200px]">
            <Image
              src={lightboxImages[lightboxIndex]?.url}
              alt={lightboxImages[lightboxIndex]?.label || ''}
              fill
              className="object-contain"
              sizes="85vw"
              priority
            />
          </div>

          {/* Thumbnail Strip */}
          {lightboxImages.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-2">
              {lightboxImages.map((img, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); }}
                  className={`w-14 h-14 relative overflow-hidden flex-shrink-0 transition-all ${
                    i === lightboxIndex
                      ? 'ring-2 ring-[var(--accent-cyan)] opacity-100'
                      : 'opacity-50 hover:opacity-80'
                  }`}
                >
                  <Image
                    src={img.url}
                    alt={img.label}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 詳細ビュー Drawer */}
      {detailDrawerOpen && detailAsset && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70"
            onClick={handleCloseDetailView}
          />

          {/* Drawer - wider for detail view */}
          <div className="absolute right-0 top-0 h-full w-[720px] bg-[var(--background)] border-l border-[var(--text-inactive)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--text-inactive)]">
              <h2 className="text-sm tracking-[2px] uppercase">詳細ビュー生成</h2>
              <button
                onClick={handleCloseDetailView}
                className="text-[var(--text-secondary)] hover:text-[var(--foreground)]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Source Design */}
              <div className="glass-card p-4">
                <h3 className="text-xs tracking-[2px] uppercase text-[var(--text-secondary)] mb-3">
                  元デザイン
                </h3>
                <div className="flex gap-4">
                  <div
                    className="aspect-[4/5] relative overflow-hidden bg-[var(--background-card)] w-[140px] flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-[var(--accent-cyan)] transition-all"
                    onClick={() => openLightbox(0)}
                  >
                    <Image
                      src={detailAsset.url}
                      alt="元デザイン"
                      fill
                      className="object-contain"
                      sizes="140px"
                    />
                  </div>
                  <div className="flex-1 min-w-0 space-y-3">
                    <div>
                      <p className="text-[10px] tracking-[1px] uppercase text-[var(--text-inactive)] mb-1">ターゲット</p>
                      <p className="text-sm">
                        {GENDER_TABS.find((t) => t.value === gender)?.label || gender}
                      </p>
                    </div>
                    {prompt && (
                      <div>
                        <p className="text-[10px] tracking-[1px] uppercase text-[var(--text-inactive)] mb-1">プロンプト</p>
                        <p className="text-xs text-[var(--text-secondary)] line-clamp-4 whitespace-pre-wrap">{prompt}</p>
                      </div>
                    )}
                    {category && (
                      <div>
                        <p className="text-[10px] tracking-[1px] uppercase text-[var(--text-inactive)] mb-1">カテゴリ</p>
                        <p className="text-sm">
                          {GARMENT_CATEGORIES.find((c) => c.value === category)?.label || category}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* View Style Selection */}
              {!detailResult && (
                <div className="glass-card p-4">
                  <h3 className="text-xs tracking-[2px] uppercase text-[var(--text-secondary)] mb-3">
                    ガーメント撮影スタイル
                  </h3>
                  <p className="text-xs text-[var(--text-inactive)] mb-3">
                    3面図の撮影スタイルを選択してください
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                      onClick={() => setViewStyle('ghost')}
                      className={`p-3 text-left border ${
                        viewStyle === 'ghost'
                          ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10'
                          : 'border-[var(--text-inactive)] hover:border-[var(--text-secondary)]'
                      }`}
                    >
                      <div className="text-sm font-medium mb-1">ゴーストマネキン</div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        透明マネキン撮影。服が立体的に見え、人物は非表示。
                      </div>
                    </button>
                    <button
                      onClick={() => setViewStyle('flatlay')}
                      className={`p-3 text-left border ${
                        viewStyle === 'flatlay'
                          ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10'
                          : 'border-[var(--text-inactive)] hover:border-[var(--text-secondary)]'
                      }`}
                    >
                      <div className="text-sm font-medium mb-1">フラットレイ</div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        平置き撮影。白い台の上にガーメントを置いた俯瞰ショット。
                      </div>
                    </button>
                  </div>

                  <button
                    onClick={handleGenerateViews}
                    disabled={generatingViews}
                    className="w-full btn-primary py-3 text-sm tracking-[1px] uppercase disabled:opacity-50"
                  >
                    {generatingViews ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="spinner w-4 h-4" />
                        生成中...
                      </span>
                    ) : (
                      '着用ルック + 3面図を生成'
                    )}
                  </button>
                  {generatingViews && (
                    <p className="text-xs text-[var(--text-inactive)] mt-2 text-center">
                      着用ルックとガーメント3面図を生成中...
                    </p>
                  )}
                </div>
              )}

              {/* Results */}
              {detailResult && (
                <>
                  {/* 着用ルック */}
                  <div className="glass-card p-4">
                    <h3 className="text-xs tracking-[2px] uppercase text-[var(--text-secondary)] mb-3">
                      着用ルック
                    </h3>
                    <div
                      className="aspect-[9/16] relative overflow-hidden bg-[var(--background-card)] max-w-[320px] mx-auto cursor-pointer hover:ring-2 hover:ring-[var(--accent-cyan)] transition-all"
                      onClick={() => openLightbox(1)}
                    >
                      <Image
                        src={detailResult.heroUrl}
                        alt="着用ルック"
                        fill
                        className="object-contain"
                        sizes="320px"
                      />
                    </div>
                  </div>

                  {/* Garment 3-View */}
                  {detailResult.garmentViews && (
                    <div className="glass-card p-4">
                      <h3 className="text-xs tracking-[2px] uppercase text-[var(--text-secondary)] mb-3">
                        GARMENT VIEWS ({viewStyle === 'ghost' ? 'ゴーストマネキン' : 'フラットレイ'})
                      </h3>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <p className="text-xs text-[var(--text-inactive)] mb-1 text-center uppercase">FRONT</p>
                          <div
                            className="aspect-[3/4] relative overflow-hidden bg-[var(--background-card)] cursor-pointer hover:ring-2 hover:ring-[var(--accent-cyan)] transition-all"
                            onClick={() => openLightbox(2)}
                          >
                            <Image
                              src={detailResult.garmentViews.frontUrl}
                              alt="フロント"
                              fill
                              className="object-contain"
                              sizes="200px"
                            />
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--text-inactive)] mb-1 text-center uppercase">
                            {viewStyle === 'ghost' ? 'SIDE' : 'DETAIL'}
                          </p>
                          <div
                            className="aspect-[3/4] relative overflow-hidden bg-[var(--background-card)] cursor-pointer hover:ring-2 hover:ring-[var(--accent-cyan)] transition-all"
                            onClick={() => openLightbox(3)}
                          >
                            <Image
                              src={detailResult.garmentViews.sideUrl}
                              alt="サイド"
                              fill
                              className="object-contain"
                              sizes="200px"
                            />
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--text-inactive)] mb-1 text-center uppercase">BACK</p>
                          <div
                            className="aspect-[3/4] relative overflow-hidden bg-[var(--background-card)] cursor-pointer hover:ring-2 hover:ring-[var(--accent-cyan)] transition-all"
                            onClick={() => openLightbox(4)}
                          >
                            <Image
                              src={detailResult.garmentViews.backUrl}
                              alt="バック"
                              fill
                              className="object-contain"
                              sizes="200px"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Regenerate */}
                  <button
                    onClick={() => setDetailResult(null)}
                    className="w-full btn-glow py-2 text-xs tracking-[1px] uppercase"
                  >
                    もう一度生成
                  </button>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--text-inactive)]">
              <button
                onClick={handleCloseDetailView}
                className="w-full btn-glow py-2 text-xs tracking-[1px] uppercase"
              >
                完了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
