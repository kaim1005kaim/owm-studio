import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getSupabase, getWorkspaceBySlug } from '@/lib/supabase';
import { getObjectAsBase64, uploadBase64ToR2, generateR2Key, getPublicUrl } from '@/lib/r2';
import { generateDesigns, generateInspiration } from '@/lib/gemini';

export const maxDuration = 300; // 5 minutes for batch generation

interface GenerateRequest {
  workspaceSlug: string;
  boardId: string;
  prompt: string;
  count: 4 | 8 | 12;
  aspectRatio?: string;
  imageSize?: '2K' | '4K';
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const body: GenerateRequest = await request.json();
    const { workspaceSlug, boardId, prompt, count = 4 } = body;

    if (!workspaceSlug || !boardId || !prompt) {
      return NextResponse.json(
        { error: 'workspaceSlug, boardId, and prompt are required' },
        { status: 400 }
      );
    }

    // Get workspace
    const workspace = await getWorkspaceBySlug(workspaceSlug);
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    // Get board with assets
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
      .limit(8); // Max 8 reference images

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

    // Get reference images as base64
    const referenceImages: { base64: string; mimeType: string }[] = [];
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
        board_id: boardId,
        prompt,
        model: 'gemini-2.5-flash-image',
        config: {
          count,
          aspectRatio: body.aspectRatio || '4:5',
          imageSize: body.imageSize || '2K',
        },
      });

    if (genError) {
      console.error('Generation record error:', genError);
      return NextResponse.json({ error: 'Failed to create generation record' }, { status: 500 });
    }

    // Generate inspiration text
    let inspirationText = '';
    try {
      inspirationText = await generateInspiration(referenceImages.slice(0, 4));
    } catch (error) {
      console.error('Inspiration generation failed:', error);
    }

    // Generate designs (limited count to avoid timeout)
    const actualCount = Math.min(count, 4); // Limit to 4 for now to avoid timeout
    const outputs: {
      id: string;
      assetId: string;
      url: string;
    }[] = [];

    try {
      const generatedImages = await generateDesigns(
        referenceImages,
        `${prompt}\n\n参考インスピレーション:\n${inspirationText}`,
        actualCount
      );

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
