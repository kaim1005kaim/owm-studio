/**
 * Replace textile images script (standalone, no API required)
 * Run with: npx tsx scripts/replace-textile-images.ts
 */

import * as fs from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const REPLACEMENTS = [
  {
    assetId: '1028d896-ff4a-44ef-b72c-51d621c88f9f',
    imagePath: '/Users/kaimoriguchi/Downloads/donguri3872__--v_7_b4ee9449-b52e-401f-a393-fde1c94ceeaf_1.png',
    artistName: '伊藤 さくら',
    title: '森の精霊',
    newTitle: null, // Keep original
  },
  {
    assetId: '51bda12e-3095-4e9b-a96b-5c3134697524',
    imagePath: '/Users/kaimoriguchi/Downloads/donguri3872__--v_7_f89035f8-15f1-4e94-a90b-a726bbdd10d2_1.png',
    artistName: '佐藤 花子',
    title: '星空のダンス',
    newTitle: null, // Keep original
  },
  {
    assetId: '03c034a2-bcdb-4e8c-a221-59250a5df0e7',
    imagePath: '/Users/kaimoriguchi/Downloads/donguri3872__--v_7_261cd124-cb48-4e01-8906-76ff16916390_0.png',
    artistName: '渡辺 大輝',
    title: '朝焼けの詩',
    newTitle: '実りの彩り', // Change to fruit-related title
  },
];

// Initialize clients
function getR2Client(): S3Client {
  const endpoint = process.env.R2_ENDPOINT;

  if (!endpoint) {
    throw new Error('R2_ENDPOINT is required');
  }

  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase URL and key are required');
  }

  return createClient(url, key);
}

async function replaceImage(item: typeof REPLACEMENTS[0]) {
  if (!fs.existsSync(item.imagePath)) {
    console.log(`✗ File not found: ${item.imagePath}`);
    return false;
  }

  const r2Client = getR2Client();
  const supabase = getSupabase();
  const bucket = process.env.R2_BUCKET || process.env.R2_BUCKET_NAME || '';
  const publicUrlBase = process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';

  // Generate new r2Key with timestamp to bust cache
  const timestamp = Date.now();
  const newR2Key = `ws/heralbony_demo/ref/2026/02/${item.assetId}_${timestamp}.png`;

  try {
    // Read image file
    const imageBuffer = fs.readFileSync(item.imagePath);

    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: newR2Key,
      Body: imageBuffer,
      ContentType: 'image/png',
    });

    await r2Client.send(command);
    console.log(`✓ Uploaded to R2: ${newR2Key}`);

    // Update database with new r2_key
    const { error: updateError } = await supabase
      .from('assets')
      .update({
        r2_key: newR2Key,
        mime: 'image/png',
      })
      .eq('id', item.assetId);

    if (updateError) {
      console.log(`✗ Failed to update database: ${updateError.message}`);
      return false;
    }

    const newUrl = `${publicUrlBase}/${newR2Key}`;
    console.log(`✓ Image replaced: ${item.artistName} - ${item.title}`);
    console.log(`  → New URL: ${newUrl}`);

    // Update title if needed
    if (item.newTitle) {
      const { data: asset } = await supabase
        .from('assets')
        .select('metadata')
        .eq('id', item.assetId)
        .single();

      const currentMetadata = asset?.metadata || {};
      const { error: metaError } = await supabase
        .from('assets')
        .update({
          metadata: {
            ...currentMetadata,
            artist_name: item.artistName,
            textile_title: item.newTitle,
          },
        })
        .eq('id', item.assetId);

      if (metaError) {
        console.log(`  → Title update failed: ${metaError.message}`);
      } else {
        console.log(`  → Title updated to: ${item.newTitle}`);
      }
    }

    return true;
  } catch (error) {
    console.error(`Error: ${item.artistName}`, error);
    return false;
  }
}

async function main() {
  console.log('\nReplacing textile images with new R2 keys (cache bust)...\n');
  console.log('Environment check:');
  console.log(`  R2_ENDPOINT: ${process.env.R2_ENDPOINT ? '✓' : '✗'}`);
  console.log(`  R2_ACCESS_KEY_ID: ${process.env.R2_ACCESS_KEY_ID ? '✓' : '✗'}`);
  console.log(`  R2_BUCKET: ${process.env.R2_BUCKET || process.env.R2_BUCKET_NAME || '✗'}`);
  console.log(`  SUPABASE_URL: ${process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓' : '✗'}`);
  console.log('');

  for (const item of REPLACEMENTS) {
    await replaceImage(item);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\nDone!');
}

main().catch(console.error);
