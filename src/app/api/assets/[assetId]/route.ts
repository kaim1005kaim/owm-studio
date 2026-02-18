import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, getWorkspaceBySlug } from '@/lib/supabase';
import { getPublicUrl } from '@/lib/r2';

export const maxDuration = 30;

interface RouteParams {
  params: Promise<{ assetId: string }>;
}

/**
 * Get a single asset by ID
 * Used by Heralbony's textile selection flow
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { assetId } = await params;
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const workspaceSlug = searchParams.get('workspaceSlug');

    if (!workspaceSlug) {
      return NextResponse.json({ error: 'workspaceSlug is required' }, { status: 400 });
    }

    if (!assetId) {
      return NextResponse.json({ error: 'assetId is required' }, { status: 400 });
    }

    // Get workspace
    const workspace = await getWorkspaceBySlug(workspaceSlug);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Fetch asset with annotations
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select(`
        *,
        asset_annotations (
          caption,
          tags,
          silhouette,
          material,
          pattern,
          details,
          mood,
          color_palette
        )
      `)
      .eq('id', assetId)
      .eq('workspace_id', workspace.id)
      .single();

    if (assetError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Build response with URLs and flattened annotations
    const assetWithUrl = {
      ...asset,
      url: getPublicUrl(asset.r2_key),
      thumbUrl: asset.thumb_r2_key ? getPublicUrl(asset.thumb_r2_key) : null,
      // Flatten annotations if present
      ...(asset.asset_annotations?.[0] || {}),
    };

    return NextResponse.json({
      success: true,
      asset: assetWithUrl,
    });
  } catch (error) {
    console.error('Asset fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch asset' },
      { status: 500 }
    );
  }
}
