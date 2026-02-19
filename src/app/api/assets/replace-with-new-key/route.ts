import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, getWorkspaceBySlug } from '@/lib/supabase';
import { uploadBase64ToR2, getPublicUrl } from '@/lib/r2';

export const maxDuration = 30;

interface ReplaceWithNewKeyRequest {
  assetId: string;
  newR2Key: string;
  imageBase64: string;
  mimeType: string;
  workspaceSlug: string;
}

/**
 * Replace an asset's image with a new R2 key (cache bust)
 * Uploads to new key and updates database
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body: ReplaceWithNewKeyRequest = await request.json();
    const { assetId, newR2Key, imageBase64, mimeType, workspaceSlug } = body;

    if (!assetId || !newR2Key || !imageBase64 || !workspaceSlug) {
      return NextResponse.json(
        { error: 'assetId, newR2Key, imageBase64, and workspaceSlug are required' },
        { status: 400 }
      );
    }

    // Get workspace
    const workspace = await getWorkspaceBySlug(workspaceSlug);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Verify asset exists and belongs to workspace
    const { data: asset, error: fetchError } = await supabase
      .from('assets')
      .select('id, r2_key')
      .eq('id', assetId)
      .eq('workspace_id', workspace.id)
      .single();

    if (fetchError || !asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Upload image to new R2 key
    await uploadBase64ToR2(newR2Key, imageBase64, mimeType);

    // Update database with new r2_key
    const { error: updateError } = await supabase
      .from('assets')
      .update({
        r2_key: newR2Key,
        mime: mimeType,
      })
      .eq('id', assetId);

    if (updateError) {
      console.error('Failed to update asset r2_key:', updateError);
      return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 });
    }

    const newUrl = getPublicUrl(newR2Key);
    console.log(`Replaced image for asset ${assetId} with new key: ${newUrl}`);

    return NextResponse.json({
      success: true,
      assetId,
      url: newUrl,
      r2Key: newR2Key,
    });
  } catch (error) {
    console.error('Replace with new key error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Replace failed' },
      { status: 500 }
    );
  }
}
