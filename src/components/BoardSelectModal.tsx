'use client';

import { useState, useEffect } from 'react';

const WORKSPACE_SLUG = 'maison_demo';

interface Board {
  id: string;
  name: string;
  asset_count: number;
}

interface BoardSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAssetIds: string[];
  onComplete: () => void;
}

export default function BoardSelectModal({
  isOpen,
  onClose,
  selectedAssetIds,
  onComplete,
}: BoardSelectModalProps) {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedBoardId(null);
    setShowCreate(false);
    setNewBoardName('');
    fetchBoards();
  }, [isOpen]);

  const fetchBoards = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/boards?workspaceSlug=${WORKSPACE_SLUG}`);
      const data = await res.json();
      if (data.success) {
        setBoards(data.boards);
      }
    } catch (error) {
      console.error('Failed to fetch boards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceSlug: WORKSPACE_SLUG,
          name: newBoardName.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewBoardName('');
        setShowCreate(false);
        setSelectedBoardId(data.board.id);
        await fetchBoards();
      }
    } catch (error) {
      console.error('Failed to create board:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleAddToBoard = async () => {
    if (!selectedBoardId || selectedAssetIds.length === 0) return;
    setAdding(true);
    try {
      for (const assetId of selectedAssetIds) {
        await fetch('/api/boards', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            boardId: selectedBoardId,
            assetId,
            action: 'add',
          }),
        });
      }
      onComplete();
      onClose();
    } catch (error) {
      console.error('Failed to add to board:', error);
    } finally {
      setAdding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative glass-card w-full max-w-md mx-4 p-6 fade-in max-h-[70vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg tracking-[2px] uppercase">ボードに追加</h2>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--foreground)]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-xs text-[var(--text-secondary)] mb-4">
          {selectedAssetIds.length}枚の画像を追加するボードを選択してください
        </p>

        {/* Board List */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="spinner" />
            </div>
          ) : boards.length === 0 && !showCreate ? (
            <div className="text-center py-8">
              <p className="text-sm text-[var(--text-secondary)] mb-3">ボードがまだありません</p>
              <button
                onClick={() => setShowCreate(true)}
                className="btn-glow px-4 py-2 text-xs tracking-[1px] uppercase"
              >
                新規作成
              </button>
            </div>
          ) : (
            <>
              {boards.map((board) => (
                <button
                  key={board.id}
                  onClick={() => setSelectedBoardId(board.id)}
                  className={`w-full text-left p-3 transition-colors ${
                    selectedBoardId === board.id
                      ? 'bg-[var(--accent-cyan)]/10 border border-[var(--accent-cyan)]'
                      : 'bg-[var(--background)] border border-[var(--text-inactive)] hover:border-[var(--text-secondary)]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm tracking-[1px]">{board.name}</span>
                    <span className="text-xs text-[var(--text-inactive)]">
                      {board.asset_count}枚
                    </span>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>

        {/* Create New Board Inline */}
        {showCreate ? (
          <div className="border-t border-[var(--text-inactive)] pt-4 mb-4">
            <input
              type="text"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder="新規ボード名..."
              className="w-full bg-[var(--background)] border border-[var(--text-inactive)] px-4 py-2 text-sm mb-3 focus:border-[var(--accent-cyan)] outline-none"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateBoard()}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 px-3 py-2 text-xs tracking-[1px] uppercase text-[var(--text-secondary)] hover:text-[var(--foreground)]"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreateBoard}
                disabled={!newBoardName.trim() || creating}
                className="flex-1 btn-primary px-3 py-2 text-xs tracking-[1px] uppercase disabled:opacity-50"
              >
                {creating ? '作成中...' : '作成'}
              </button>
            </div>
          </div>
        ) : (
          boards.length > 0 && (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full text-xs text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] tracking-[1px] uppercase py-2 mb-4 border border-dashed border-[var(--text-inactive)] hover:border-[var(--accent-cyan)] transition-colors"
            >
              + 新規ボード作成
            </button>
          )
        )}

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs tracking-[1px] uppercase text-[var(--text-secondary)] hover:text-[var(--foreground)]"
          >
            キャンセル
          </button>
          <button
            onClick={handleAddToBoard}
            disabled={!selectedBoardId || adding}
            className="btn-primary px-6 py-2 text-xs tracking-[1px] uppercase disabled:opacity-50"
          >
            {adding ? '追加中...' : '追加する'}
          </button>
        </div>
      </div>
    </div>
  );
}
