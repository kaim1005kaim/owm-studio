import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getSupabase, getWorkspaceBySlug } from '@/lib/supabase';
import { getPublicUrl } from '@/lib/r2';

export const maxDuration = 30;

// GET - List boards or get single board with assets
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const workspaceSlug = searchParams.get('workspaceSlug');
    const boardId = searchParams.get('boardId');

    if (!workspaceSlug) {
      return NextResponse.json({ error: 'workspaceSlug is required' }, { status: 400 });
    }

    const workspace = await getWorkspaceBySlug(workspaceSlug);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    if (boardId) {
      // Get single board with assets
      const { data: board, error: boardError } = await supabase
        .from('boards')
        .select('*')
        .eq('id', boardId)
        .eq('workspace_id', workspace.id)
        .single();

      if (boardError || !board) {
        return NextResponse.json({ error: 'Board not found' }, { status: 404 });
      }

      // Get board items with assets
      const { data: items, error: itemsError } = await supabase
        .from('board_items')
        .select(`
          position,
          assets!inner (
            id,
            r2_key,
            thumb_r2_key,
            title,
            status,
            asset_annotations (
              caption,
              tags,
              silhouette,
              material,
              mood
            )
          )
        `)
        .eq('board_id', boardId)
        .order('position', { ascending: true });

      if (itemsError) {
        console.error('Board items error:', itemsError);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const assets = (items || []).map((item: any) => {
        const asset = item.assets;
        return {
          id: asset.id,
          position: item.position,
          url: getPublicUrl(asset.r2_key),
          thumbUrl: asset.thumb_r2_key ? getPublicUrl(asset.thumb_r2_key) : null,
          title: asset.title,
          status: asset.status,
          annotation: asset.asset_annotations?.[0] || null,
        };
      });

      return NextResponse.json({
        success: true,
        board: {
          ...board,
          assets,
        },
      });
    } else {
      // List all boards
      const { data: boards, error } = await supabase
        .from('boards_with_counts')
        .select('*')
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Boards fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch boards' }, { status: 500 });
      }

      // Fetch generation thumbnails for all boards
      const boardIds = (boards || []).map((b: { id: string }) => b.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const boardGenPreviews: Record<string, { url: string }[]> = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const boardGenCounts: Record<string, number> = {};

      if (boardIds.length > 0) {
        // Get generations for all boards
        const { data: allGens } = await supabase
          .from('generations')
          .select('id, board_id')
          .in('board_id', boardIds);

        if (allGens && allGens.length > 0) {
          const genIds = allGens.map((g: { id: string }) => g.id);
          const genToBoardMap: Record<string, string> = {};
          for (const g of allGens) {
            genToBoardMap[g.id] = g.board_id;
          }

          // Get outputs with asset r2_keys (limit per query)
          const { data: allOutputs } = await supabase
            .from('generation_outputs')
            .select(`
              generation_id,
              assets!inner (
                r2_key
              )
            `)
            .in('generation_id', genIds);

          if (allOutputs) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for (const output of allOutputs as any[]) {
              const bId = genToBoardMap[output.generation_id];
              if (!bId) continue;
              if (!boardGenPreviews[bId]) boardGenPreviews[bId] = [];
              if (!boardGenCounts[bId]) boardGenCounts[bId] = 0;
              boardGenCounts[bId]++;
              // Keep up to 12 thumbnails
              if (boardGenPreviews[bId].length < 12) {
                boardGenPreviews[bId].push({
                  url: getPublicUrl(output.assets.r2_key),
                });
              }
            }
          }
        }
      }

      const enrichedBoards = (boards || []).map((b: { id: string }) => ({
        ...b,
        generatedImages: boardGenPreviews[b.id] || [],
        generatedCount: boardGenCounts[b.id] || 0,
      }));

      return NextResponse.json({
        success: true,
        boards: enrichedBoards,
      });
    }
  } catch (error) {
    console.error('Boards error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch boards' },
      { status: 500 }
    );
  }
}

// POST - Create new board
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { workspaceSlug, name } = await request.json();

    if (!workspaceSlug || !name) {
      return NextResponse.json(
        { error: 'workspaceSlug and name are required' },
        { status: 400 }
      );
    }

    const workspace = await getWorkspaceBySlug(workspaceSlug);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    const boardId = uuidv4();
    const { data: board, error } = await supabase
      .from('boards')
      .insert({
        id: boardId,
        workspace_id: workspace.id,
        name,
      })
      .select()
      .single();

    if (error) {
      console.error('Board create error:', error);
      return NextResponse.json({ error: 'Failed to create board' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      board,
    });
  } catch (error) {
    console.error('Board create error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create board' },
      { status: 500 }
    );
  }
}

// PUT - Add/remove asset from board
export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { boardId, assetId, action, position } = await request.json();

    if (!boardId || !assetId || !action) {
      return NextResponse.json(
        { error: 'boardId, assetId, and action are required' },
        { status: 400 }
      );
    }

    if (action === 'add') {
      // Get current max position
      const { data: maxPos } = await supabase
        .from('board_items')
        .select('position')
        .eq('board_id', boardId)
        .order('position', { ascending: false })
        .limit(1)
        .single();

      const newPosition = position ?? ((maxPos?.position || 0) + 1);

      const { error } = await supabase
        .from('board_items')
        .upsert({
          board_id: boardId,
          asset_id: assetId,
          position: newPosition,
        });

      if (error) {
        console.error('Add to board error:', error);
        return NextResponse.json({ error: 'Failed to add to board' }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: 'added' });
    } else if (action === 'remove') {
      const { error } = await supabase
        .from('board_items')
        .delete()
        .eq('board_id', boardId)
        .eq('asset_id', assetId);

      if (error) {
        console.error('Remove from board error:', error);
        return NextResponse.json({ error: 'Failed to remove from board' }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: 'removed' });
    } else if (action === 'reorder') {
      if (position === undefined) {
        return NextResponse.json({ error: 'position is required for reorder' }, { status: 400 });
      }

      const { error } = await supabase
        .from('board_items')
        .update({ position })
        .eq('board_id', boardId)
        .eq('asset_id', assetId);

      if (error) {
        console.error('Reorder error:', error);
        return NextResponse.json({ error: 'Failed to reorder' }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: 'reordered' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Board update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update board' },
      { status: 500 }
    );
  }
}

// DELETE - Delete board
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const boardId = searchParams.get('boardId');

    if (!boardId) {
      return NextResponse.json({ error: 'boardId is required' }, { status: 400 });
    }

    // Delete child records first to avoid foreign key constraint violations
    const { error: itemsError } = await supabase
      .from('board_items')
      .delete()
      .eq('board_id', boardId);

    if (itemsError) {
      console.error('Board items delete error:', itemsError);
    }

    // Get generation IDs to delete their outputs first
    const { data: gens } = await supabase
      .from('generations')
      .select('id')
      .eq('board_id', boardId);

    if (gens && gens.length > 0) {
      const genIds = gens.map((g) => g.id);
      const { error: outputsError } = await supabase
        .from('generation_outputs')
        .delete()
        .in('generation_id', genIds);

      if (outputsError) {
        console.error('Generation outputs delete error:', outputsError);
      }
    }

    const { error: gensError } = await supabase
      .from('generations')
      .delete()
      .eq('board_id', boardId);

    if (gensError) {
      console.error('Generations delete error:', gensError);
    }

    const { error } = await supabase
      .from('boards')
      .delete()
      .eq('id', boardId);

    if (error) {
      console.error('Board delete error:', error);
      return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Board delete error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete board' },
      { status: 500 }
    );
  }
}
