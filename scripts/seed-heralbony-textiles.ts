/**
 * Seed script for Heralbony textile samples
 *
 * Prerequisites:
 * 1. Dev server running: npm run dev
 * 2. Sample images in /tmp/textile-samples/
 *
 * Run with: npx tsx scripts/seed-heralbony-textiles.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const WORKSPACE_SLUG = 'heralbony_demo';

// Sample textiles with Japanese artist names
const SAMPLE_TEXTILES = [
  { file: 'abstract1.jpg', artistName: '山田 太郎', title: '夢の中の花畑' },
  { file: 'abstract2.jpg', artistName: '佐藤 花子', title: '星空のダンス' },
  { file: 'abstract3.jpg', artistName: '鈴木 一郎', title: '海と風' },
  { file: 'abstract4.jpg', artistName: '田中 美咲', title: '虹色の記憶' },
  { file: 'colorful1.jpg', artistName: '高橋 健太', title: '躍動する色彩' },
  { file: 'colorful2.jpg', artistName: '伊藤 さくら', title: '森の精霊' },
  { file: 'colorful3.jpg', artistName: '渡辺 大輝', title: '朝焼けの詩' },
  { file: 'pattern1.png', artistName: '中村 あかり', title: '幾何学の調べ' },
];

async function uploadTextile(textile: typeof SAMPLE_TEXTILES[0]) {
  const filePath = path.join('/tmp/textile-samples', textile.file);

  if (!fs.existsSync(filePath)) {
    console.log(`Skip: ${textile.file} not found`);
    return null;
  }

  const fileBuffer = fs.readFileSync(filePath);
  const mimeType = textile.file.endsWith('.png') ? 'image/png' : 'image/jpeg';

  // Create FormData
  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer], { type: mimeType }), textile.file);
  formData.append('workspaceSlug', WORKSPACE_SLUG);
  formData.append('source', 'seed');
  formData.append('title', textile.title);

  try {
    const response = await fetch(`${API_BASE}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();

    if (result.success) {
      // Update metadata with artist info
      await updateAssetMetadata(result.assetId, textile.artistName, textile.title);
      console.log(`✓ ${textile.artistName} - "${textile.title}"`);
    } else {
      console.log(`✗ ${textile.file}: ${result.error}`);
    }

    return result;
  } catch (error) {
    console.error(`Error uploading ${textile.file}:`, error);
    return null;
  }
}

async function updateAssetMetadata(assetId: string, artistName: string, textileTitle: string) {
  // Direct Supabase update for metadata
  const response = await fetch(`${API_BASE}/api/assets/update-metadata`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      assetId,
      workspaceSlug: WORKSPACE_SLUG,
      metadata: {
        artist_name: artistName,
        textile_title: textileTitle,
      },
    }),
  });
  return response.json();
}

async function main() {
  console.log(`\nSeeding ${SAMPLE_TEXTILES.length} textiles to ${WORKSPACE_SLUG}...`);
  console.log(`API: ${API_BASE}\n`);

  // Test connection
  try {
    const testResponse = await fetch(`${API_BASE}/api/assets?workspaceSlug=${WORKSPACE_SLUG}&limit=1`);
    if (!testResponse.ok) {
      console.error('Cannot connect to API. Make sure dev server is running: npm run dev');
      return;
    }
  } catch {
    console.error('Cannot connect to API. Make sure dev server is running: npm run dev');
    return;
  }

  for (const textile of SAMPLE_TEXTILES) {
    await uploadTextile(textile);
    // Small delay between uploads
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\nDone!');
}

main().catch(console.error);
