import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, getWorkspaceBySlug } from '@/lib/supabase';

export const maxDuration = 30;

interface UpdateMetadataRequest {
  assetId: string;
  workspaceSlug: string;
  metadata: {
    artist_name?: string;
    textile_title?: string;
    [key: string]: unknown;
  };
}

/**
 * Update asset metadata
 * Used for adding artist info to textile assets
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body: UpdateMetadataRequest = await request.json();
    const { assetId, workspaceSlug, metadata } = body;

    if (!assetId || !workspaceSlug || !metadata) {
      return NextResponse.json(
        { error: 'assetId, workspaceSlug, and metadata are required' },
        { status: 400 }
      );
    }

    // Get workspace
    const workspace = await getWorkspaceBySlug(workspaceSlug);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Get current asset
    const { data: asset, error: fetchError } = await supabase
      .from('assets')
      .select('id, metadata, status')
      .eq('id', assetId)
      .eq('workspace_id', workspace.id)
      .single();

    if (fetchError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Merge metadata
    const updatedMetadata = {
      ...(asset.metadata || {}),
      ...metadata,
    };

    // Update asset
    const { error: updateError } = await supabase
      .from('assets')
      .update({
        metadata: updatedMetadata,
        status: 'ready', // Mark as ready after metadata update
      })
      .eq('id', assetId);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update metadata' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      assetId,
      metadata: updatedMetadata,
    });
  } catch (error) {
    console.error('Update metadata error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Update failed' },
      { status: 500 }
    );
  }
}
