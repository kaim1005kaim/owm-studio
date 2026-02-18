import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getSupabase, getWorkspaceBySlug } from '@/lib/supabase';
import { getObjectAsBase64, uploadBase64ToR2, generateR2Key } from '@/lib/r2';
import { generateDesigns, generateInspiration, generateTextileDesigns } from '@/lib/gemini';
import { GARMENT_CATEGORY_DESCRIPTIONS, type GarmentCategory } from '@/types';

export const maxDuration = 300; // 5 minutes for batch generation

// Additional reference image (uploaded during generation)
interface AdditionalReference {
  base64: string;
  mimeType: string;
}

interface GenerateRequest {
  workspaceSlug: string;
  // Board-based flow (MAISON SPECIAL)
  boardId?: string;
  // Textile-based flow (HERALBONY)
  textileId?: string;
  artistName?: string;
  textileTitle?: string;
  additionalReferences?: AdditionalReference[];
  // Common
  prompt: string;
  count: 4 | 8 | 12;
  aspectRatio?: string;
  imageSize?: '2K' | '4K';
  category?: GarmentCategory;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body: GenerateRequest = await request.json();
    const {
      workspaceSlug,
      boardId,
      textileId,
      artistName,
      textileTitle,
      additionalReferences = [],
      prompt,
      count = 4,
      category,
    } = body;

    // Validate: need either boardId (MS flow) or textileId (HB flow)
    if (!workspaceSlug || (!boardId && !textileId) || !prompt) {
      return NextResponse.json(
        { error: 'workspaceSlug, (boardId or textileId), and prompt are required' },
        { status: 400 }
      );
    }

    // Get workspace
    const workspace = await getWorkspaceBySlug(workspaceSlug);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Determine flow type
    const isTextileFlow = !!textileId;
    const referenceImages: { base64: string; mimeType: string }[] = [];

    if (isTextileFlow) {
      // HERALBONY FLOW: Textile-based generation
      // 1. Get primary textile asset
      const { data: textileAsset, error: textileError } = await supabase
        .from('assets')
        .select('id, r2_key, mime, status, metadata')
        .eq('id', textileId)
        .eq('workspace_id', workspace.id)
        .single();

      if (textileError || !textileAsset) {
        return NextResponse.json({ error: 'Textile asset not found' }, { status: 404 });
      }

      if (textileAsset.status !== 'ready') {
        return NextResponse.json({ error: 'Textile asset is not ready' }, { status: 400 });
      }

      // Load primary textile image
      try {
        const base64 = await getObjectAsBase64(textileAsset.r2_key);
        referenceImages.push({
          base64,
          mimeType: textileAsset.mime || 'image/jpeg',
        });
      } catch (error) {
        console.error('Failed to load textile image:', error);
        return NextResponse.json({ error: 'Failed to load textile image' }, { status: 500 });
      }

      // 2. Add additional reference images (already base64 from client)
      for (const ref of additionalReferences) {
        if (ref.base64 && ref.mimeType) {
          referenceImages.push({
            base64: ref.base64,
            mimeType: ref.mimeType,
          });
        }
      }
    } else {
      // MAISON SPECIAL FLOW: Board-based generation
      const { data: boardItems, error: boardError } = await supabase
        .from('board_items')
        .select(`
          asset_id,
          position,
          assets!inner (
            id,
            r2_key,
            mime,
            status
          )
        `)
        .eq('board_id', boardId)
        .order('position', { ascending: true })
        .limit(8);

      if (boardError) {
        console.error('Board fetch error:', boardError);
        return NextResponse.json({ error: 'Failed to fetch board' }, { status: 500 });
      }

      if (!boardItems || boardItems.length === 0) {
        return NextResponse.json(
          { error: 'Board has no reference images' },
          { status: 400 }
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const item of boardItems as any[]) {
        const asset = item.assets;
        if (asset.status === 'ready') {
          try {
            const base64 = await getObjectAsBase64(asset.r2_key);
            referenceImages.push({
              base64,
              mimeType: asset.mime || 'image/jpeg',
            });
          } catch (error) {
            console.error(`Failed to load reference image ${asset.id}:`, error);
          }
        }
      }
    }

    if (referenceImages.length === 0) {
      return NextResponse.json(
        { error: 'No valid reference images found' },
        { status: 400 }
      );
    }

    // Create generation record
    const generationId = uuidv4();
    const { error: genError } = await supabase
      .from('generations')
      .insert({
        id: generationId,
        workspace_id: workspace.id,
        board_id: boardId || null,
        prompt,
        model: 'gemini-3-pro-image-preview',
        config: {
          count,
          aspectRatio: body.aspectRatio || '4:5',
          imageSize: body.imageSize || '2K',
          category: category || undefined,
          // Heralbony-specific metadata
          ...(isTextileFlow && {
            textileId,
            artistName,
            textileTitle,
            additionalReferencesCount: additionalReferences.length,
          }),
        },
      });

    if (genError) {
      console.error('Generation record error:', genError);
      return NextResponse.json({ error: 'Failed to create generation record' }, { status: 500 });
    }

    // Generate inspiration text (only for board-based flow)
    let inspirationText = '';
    if (!isTextileFlow) {
      try {
        inspirationText = await generateInspiration(referenceImages.slice(0, 4));
      } catch (error) {
        console.error('Inspiration generation failed:', error);
      }
    }

    // Generate designs (limited count to avoid timeout)
    const actualCount = Math.min(count, 4); // Limit to 4 for now to avoid timeout
    const outputs: {
      id: string;
      assetId: string;
      url: string;
    }[] = [];

    try {
      const categoryDescription = category ? GARMENT_CATEGORY_DESCRIPTIONS[category] : undefined;

      let generatedImages: { base64: string; mimeType: string }[];

      if (isTextileFlow) {
        // HERALBONY: Use textile-specific generation
        generatedImages = await generateTextileDesigns(
          referenceImages,
          prompt,
          actualCount,
          {
            artistName: artistName || 'Unknown Artist',
            textileTitle: textileTitle || 'Untitled',
            category: category || 'shirt',
            categoryDescription: categoryDescription || 'Fashion garment',
          }
        );
      } else {
        // MAISON SPECIAL: Use standard generation
        generatedImages = await generateDesigns(
          referenceImages,
          `${prompt}\n\n参考インスピレーション:\n${inspirationText}`,
          actualCount,
          category ? { category, categoryDescription } : undefined
        );
      }

      // Save each generated image
      for (const image of generatedImages) {
        const assetId = uuidv4();
        const r2Key = generateR2Key(workspaceSlug, 'gen', assetId, 'png');

        // Upload to R2
        const publicUrl = await uploadBase64ToR2(r2Key, image.base64, image.mimeType);

        // Create asset record
        const { error: assetError } = await supabase
          .from('assets')
          .insert({
            id: assetId,
            workspace_id: workspace.id,
            kind: 'generated',
            source: 'generated',
            status: 'ready',
            r2_key: r2Key,
            mime: image.mimeType,
            metadata: {
              generationId,
              prompt,
            },
          });

        if (assetError) {
          console.error('Asset save error:', assetError);
          continue;
        }

        // Create generation output record
        const outputId = uuidv4();
        const { error: outputError } = await supabase
          .from('generation_outputs')
          .insert({
            id: outputId,
            generation_id: generationId,
            asset_id: assetId,
            score: 0,
            liked: false,
          });

        if (outputError) {
          console.error('Output save error:', outputError);
          continue;
        }

        outputs.push({
          id: outputId,
          assetId,
          url: publicUrl,
        });
      }
    } catch (error) {
      console.error('Generation failed:', error);
    }

    return NextResponse.json({
      success: true,
      generationId,
      prompt,
      inspiration: inspirationText,
      outputs,
      totalRequested: count,
      totalGenerated: outputs.length,
    });
  } catch (error) {
    console.error('Generate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
