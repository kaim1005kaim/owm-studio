import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, getWorkspaceBySlug } from '@/lib/supabase';
import { getPublicUrl } from '@/lib/r2';
import type { LibraryFilters } from '@/types';

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const workspaceSlug = searchParams.get('workspaceSlug');
    const assetId = searchParams.get('assetId');
    const source = searchParams.get('source'); // seed, user_upload
    const collection = searchParams.get('collection');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const silhouette = searchParams.get('silhouette');
    const material = searchParams.get('material');
    const mood = searchParams.get('mood');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!workspaceSlug) {
      return NextResponse.json({ error: 'workspaceSlug is required' }, { status: 400 });
    }

    // Get workspace
    const workspace = await getWorkspaceBySlug(workspaceSlug);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Single asset fetch by ID (supports both reference and generated)
    if (assetId) {
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

      const assetWithUrl = {
        ...asset,
        url: getPublicUrl(asset.r2_key),
        thumbUrl: asset.thumb_r2_key ? getPublicUrl(asset.thumb_r2_key) : null,
        // Flatten annotations if present
        ...(asset.asset_annotations?.[0] || {}),
      };

      return NextResponse.json({
        success: true,
        assets: [assetWithUrl],
        total: 1,
        limit: 1,
        offset: 0,
      });
    }

    // Library fetch (reference assets only)
    let query = supabase
      .from('assets_with_annotations')
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspace.id)
      .eq('kind', 'reference')
      .eq('status', 'ready')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (source) {
      query = query.eq('source', source);
    }
    if (collection) {
      query = query.eq('collection', collection);
    }
    if (silhouette) {
      query = query.eq('silhouette', silhouette);
    }
    if (material) {
      query = query.eq('material', material);
    }
    if (mood) {
      query = query.eq('mood', mood);
    }
    if (tags && tags.length > 0) {
      query = query.overlaps('tags', tags);
    }

    const { data: assets, error, count } = await query;

    if (error) {
      console.error('Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
    }

    // Add public URLs
    const assetsWithUrls = (assets || []).map((asset) => ({
      ...asset,
      url: getPublicUrl(asset.r2_key),
      thumbUrl: asset.thumb_r2_key ? getPublicUrl(asset.thumb_r2_key) : null,
    }));

    return NextResponse.json({
      success: true,
      assets: assetsWithUrls,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Assets fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch assets' },
      { status: 500 }
    );
  }
}

// Get filter options
export async function OPTIONS(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const workspaceSlug = searchParams.get('workspaceSlug');

    if (!workspaceSlug) {
      return NextResponse.json({ error: 'workspaceSlug is required' }, { status: 400 });
    }

    const workspace = await getWorkspaceBySlug(workspaceSlug);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Get distinct values for filters
    const [
      { data: collections },
      { data: silhouettes },
      { data: materials },
      { data: moods },
      { data: tagsData },
    ] = await Promise.all([
      supabase
        .from('assets')
        .select('collection')
        .eq('workspace_id', workspace.id)
        .not('collection', 'is', null),
      supabase
        .from('asset_annotations')
        .select('silhouette')
        .not('silhouette', 'is', null),
      supabase
        .from('asset_annotations')
        .select('material')
        .not('material', 'is', null),
      supabase
        .from('asset_annotations')
        .select('mood')
        .not('mood', 'is', null),
      supabase
        .from('asset_annotations')
        .select('tags'),
    ]);

    // Extract unique values
    const uniqueCollections = [...new Set(collections?.map((c) => c.collection))];
    const uniqueSilhouettes = [...new Set(silhouettes?.map((s) => s.silhouette))];
    const uniqueMaterials = [...new Set(materials?.map((m) => m.material))];
    const uniqueMoods = [...new Set(moods?.map((m) => m.mood))];
    const uniqueTags = [...new Set(tagsData?.flatMap((t) => t.tags || []))];

    return NextResponse.json({
      success: true,
      filters: {
        collections: uniqueCollections.filter(Boolean),
        silhouettes: uniqueSilhouettes.filter(Boolean),
        materials: uniqueMaterials.filter(Boolean),
        moods: uniqueMoods.filter(Boolean),
        tags: uniqueTags.filter(Boolean).sort(),
      },
    });
  } catch (error) {
    console.error('Filter options error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch filter options' },
      { status: 500 }
    );
  }
}
