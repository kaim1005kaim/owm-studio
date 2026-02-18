/**
 * Gemini API Client for OWM Biz Demo
 * Uses Google AI Studio API (not Vertex AI) for simplicity
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Model IDs
const TEXT_MODEL = 'gemini-2.0-flash';
const IMAGE_MODEL = 'gemini-3-pro-image-preview'; // High-quality image generation model

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

interface GeminiResponse {
  candidates?: {
    content: {
      parts: GeminiPart[];
    };
    finishReason?: string;
  }[];
  error?: {
    code: number;
    message: string;
  };
}

interface GenerateConfig {
  temperature?: number;
  maxOutputTokens?: number;
  responseModalities?: string[];
}

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Call Gemini API with retry logic
 */
async function callGeminiAPI(
  model: string,
  contents: GeminiContent[],
  config: GenerateConfig = {}
): Promise<GeminiResponse> {
  const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents,
    generationConfig: {
      temperature: config.temperature ?? 0.7,
      maxOutputTokens: config.maxOutputTokens ?? 8192,
      ...(config.responseModalities && {
        responseModalities: config.responseModalities,
      }),
    },
  };

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        // Retry on 500/503 errors
        if ((response.status === 500 || response.status === 503) && attempt < MAX_RETRIES - 1) {
          console.log(`Gemini API error ${response.status}, retrying in ${RETRY_DELAYS[attempt]}ms...`);
          await sleep(RETRY_DELAYS[attempt]);
          continue;
        }
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      // Retry on network errors
      if (attempt < MAX_RETRIES - 1 && error instanceof TypeError) {
        console.log(`Network error, retrying in ${RETRY_DELAYS[attempt]}ms...`);
        await sleep(RETRY_DELAYS[attempt]);
        continue;
      }
      throw error;
    }
  }

  throw new Error('Max retries exceeded');
}

/**
 * Extract text from Gemini response
 */
function extractTextFromResponse(response: GeminiResponse): string {
  if (response.error) {
    throw new Error(`Gemini error: ${response.error.message}`);
  }
  if (!response.candidates?.[0]?.content?.parts) {
    throw new Error('No content in response');
  }
  return response.candidates[0].content.parts
    .filter((part) => part.text)
    .map((part) => part.text)
    .join('');
}

/**
 * Extract image data from Gemini response
 */
function extractImageFromResponse(response: GeminiResponse): { base64: string; mimeType: string } | null {
  if (response.error) {
    throw new Error(`Gemini error: ${response.error.message}`);
  }
  if (!response.candidates?.[0]?.content?.parts) {
    return null;
  }
  const imagePart = response.candidates[0].content.parts.find((part) => part.inlineData);
  if (!imagePart?.inlineData) {
    return null;
  }
  return {
    base64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType,
  };
}

/**
 * Repair common JSON issues from LLM output
 */
function repairJSON(text: string): string {
  let json = text.trim();

  // Remove markdown code blocks
  if (json.startsWith('```json')) {
    json = json.replace(/^```json\n?/, '').replace(/\n?```$/, '');
  } else if (json.startsWith('```')) {
    json = json.replace(/^```\n?/, '').replace(/\n?```$/, '');
  }

  // Remove trailing commas
  json = json.replace(/,(\s*[}\]])/g, '$1');

  // Fix missing commas between array items
  json = json.replace(/(\d+)\s*\n\s*\{/g, '$1},\n    {');

  // Fix missing closing braces
  json = json.replace(/(:\s*[\d.]+)\s*\n(\s*),/g, '$1 }$2,');
  json = json.replace(/(:\s*[\d.]+)\s*\n(\s*)\]/g, '$1 }$2]');

  return json;
}

/**
 * Parse JSON with repair
 */
function parseJSONWithRepair<T>(text: string): T {
  try {
    return JSON.parse(repairJSON(text));
  } catch (firstError) {
    // More aggressive repair
    let json = repairJSON(text);
    json = json.replace(/("weight":\s*[\d.]+)(\s*)(,|\])/g, (match, weight, space, delimiter) => {
      if (match.includes('}')) return match;
      return `${weight} }${space}${delimiter}`;
    });
    return JSON.parse(json);
  }
}

/**
 * Annotate a reference image with tags and description
 */
export async function annotateImage(base64Image: string, mimeType: string = 'image/jpeg'): Promise<{
  caption: string;
  tags: string[];
  silhouette: string;
  material: string;
  pattern: string;
  details: string;
  mood: string;
  color_palette: string[];
}> {
  const prompt = `あなたはファッション企画のアーカイブ整理担当です。
この画像を分析し、以下のJSON形式で返してください。タグは英語で3〜12個付けてください。曖昧な表現は避けてください。

{
  "caption": "画像の簡潔な説明（日本語、1-2文）",
  "tags": ["techwear", "oversized", "layered", ...],
  "silhouette": "oversized / boxy / fitted / A-line など",
  "material": "主要な素材（nylon / wool blend / cotton など）",
  "pattern": "パターン（solid / stripe / check / floral など）",
  "details": "特徴的なディテール（zip, drawstring, utility pockets など）",
  "mood": "雰囲気（urban / high-fashion street / casual など）",
  "color_palette": ["black", "charcoal", "acid green"]
}

JSONのみを返してください。`;

  const response = await callGeminiAPI(
    TEXT_MODEL,
    [
      {
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: base64Image.replace(/^data:image\/\w+;base64,/, ''),
            },
          },
        ],
      },
    ],
    { temperature: 0.3, maxOutputTokens: 2048 }
  );

  const text = extractTextFromResponse(response);
  return parseJSONWithRepair(text);
}

/**
 * Generate fashion design images based on reference images and prompt
 */
export async function generateDesigns(
  referenceImages: { base64: string; mimeType: string }[],
  prompt: string,
  count: number = 1,
  options?: { category?: string; categoryDescription?: string }
): Promise<{ base64: string; mimeType: string }[]> {
  const categoryBlock = options?.category
    ? `\n[GARMENT CATEGORY]\nCategory: ${options.category}${options.categoryDescription ? `\nDescription: ${options.categoryDescription}` : ''}
Generate designs specifically for this garment category. The output must clearly be this type of garment.\n`
    : '';

  const systemPrompt = `あなたはファッションデザインのAIアシスタントです。
参照画像の要素を抽出して「新規デザイン案」を生成してください。

重要なルール:
- ブランドロゴや既存デザインを直接コピーしない
- 参照画像からシルエット、素材感、カラーパレット、ディテールを抽象化して活用
- 出力はファッションルックのプロダクト写真風
- 背景はシンプルな白またはライトグレー
- テキスト、ラベル、透かしを含めない
${categoryBlock}
[COMPOSITION - CRITICAL]
- MUST show exactly ONE model in FULL-BODY view (head to toe visible)
- Camera angle: straight-on or slight angle, showing entire body from head to feet
- NO close-up shots of garments or details
- NO cropped views (waist-up, torso only, etc.)
- NO flat lay or product-only shots
- NO multiple models or collage layouts
- The model should be centered, standing naturally, with full outfit visible
[DESIGN DIVERSITY]
Each design should explore a DIFFERENT design approach. Vary silhouettes, construction techniques, fabric choices, and color palettes.
Consider these techniques: clean minimal, structured tailoring, soft draping, deconstructed, volume play, layered composition, precision sportif, neo-classical.
Use specific construction terminology: princess seam, French seam, raglan, saddle shoulder, set-in sleeve, concealed placket, stand collar, shawl lapel, welt pocket, paper-bag waist.
Explore diverse aesthetics: quiet luxury, dark romanticism, Mediterranean ease, Japanese minimalism, power tailoring, soft futurism, artisanal craft.

[COMPLETE OUTFIT STYLING]
- Show a FULL coordinated look, not just the main garment
- Include appropriate innerwear visible at neckline
- Show stylish footwear that matches the outfit's vibe
- Include accessories where appropriate: belt, bag, scarf, watch, jewelry

ユーザーの指示:
${prompt}

ユニークなバリエーションを1つ生成してください。色・素材・ディテール・シルエットを変えて多様性を出してください。

[NEGATIVE]
- NO logos, brand names, monograms, or brand identifiers
- NO text, labels, watermarks, or typography
- NO 3D render look, illustration, or painting style
- NO close-up or detail shots of clothing
- NO cropped or partial body views
- NO flat lay or product-only photography
- NO multiple models or split-screen layouts
- Must look like a real fashion photograph with single full-body model`;

  const parts: GeminiPart[] = [
    { text: systemPrompt },
    ...referenceImages.map((img) => ({
      inlineData: {
        mimeType: img.mimeType,
        data: img.base64.replace(/^data:image\/\w+;base64,/, ''),
      },
    })),
  ];

  const results: { base64: string; mimeType: string }[] = [];

  // Generate images one by one (Gemini generates one at a time)
  for (let i = 0; i < count; i++) {
    try {
      // Add delay between requests to avoid rate limiting (10 req/min limit)
      if (i > 0) {
        await sleep(7000); // 7 seconds between requests
      }

      const response = await callGeminiAPI(
        IMAGE_MODEL,
        [{ role: 'user', parts }],
        {
          temperature: 0.8 + (i * 0.05), // Slightly vary temperature for diversity
          responseModalities: ['IMAGE', 'TEXT'],
        }
      );

      const image = extractImageFromResponse(response);
      if (image) {
        results.push(image);
      }
    } catch (error) {
      console.error(`Error generating image ${i + 1}:`, error);
      // If rate limited, wait longer before next attempt
      if (error instanceof Error && error.message.includes('429')) {
        await sleep(60000); // Wait 60 seconds on rate limit
      }
    }
  }

  return results;
}

/**
 * Edit an existing image based on instruction
 */
export async function editImage(
  base64Image: string,
  mimeType: string,
  instruction: string
): Promise<{ base64: string; mimeType: string } | null> {
  const prompt = `この画像をベースに、次の変更だけを行ってください。他の要素は可能な限り保持してください:

${instruction}

変更点が自然に見えるようにしてください。プロダクト写真風の品質を維持し、背景は維持してください。
テキスト、ラベル、透かしを含めないでください。`;

  const response = await callGeminiAPI(
    IMAGE_MODEL,
    [
      {
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: base64Image.replace(/^data:image\/\w+;base64,/, ''),
            },
          },
        ],
      },
    ],
    {
      temperature: 0.7,
      responseModalities: ['IMAGE', 'TEXT'],
    }
  );

  return extractImageFromResponse(response);
}

/**
 * Generate a single fashion design image (for streaming)
 */
export async function generateSingleDesign(
  referenceImages: { base64: string; mimeType: string }[],
  prompt: string,
  index: number = 0
): Promise<{ base64: string; mimeType: string } | null> {
  const systemPrompt = `あなたはファッションデザインのAIアシスタントです。
参照画像の要素を抽出して「新規デザイン案」を生成してください。

重要なルール:
- ブランドロゴや既存デザインを直接コピーしない
- 参照画像からシルエット、素材感、カラーパレット、ディテールを抽象化して活用
- 出力はファッションルックのプロダクト写真風
- 背景はシンプルな白またはライトグレー
- テキスト、ラベル、透かしを含めない

[COMPOSITION - CRITICAL]
- MUST show exactly ONE model in FULL-BODY view (head to toe visible)
- Camera angle: straight-on or slight angle, showing entire body from head to feet
- NO close-up shots of garments or details
- NO cropped views (waist-up, torso only, etc.)
- NO flat lay or product-only shots
- NO multiple models or collage layouts
- The model should be centered, standing naturally, with full outfit visible

ユーザーの指示:
${prompt}

ユニークなバリエーションを1つ生成してください。`;

  const parts: GeminiPart[] = [
    { text: systemPrompt },
    ...referenceImages.map((img) => ({
      inlineData: {
        mimeType: img.mimeType,
        data: img.base64.replace(/^data:image\/\w+;base64,/, ''),
      },
    })),
  ];

  // Add delay for rate limiting (except first request)
  if (index > 0) {
    await sleep(7000);
  }

  const response = await callGeminiAPI(
    IMAGE_MODEL,
    [{ role: 'user', parts }],
    {
      temperature: 0.8 + (index * 0.05),
      responseModalities: ['IMAGE', 'TEXT'],
    }
  );

  return extractImageFromResponse(response);
}

/**
 * Generate an image with a reference image (for hero shots and spec sheets)
 * Uses the reference as design DNA while applying the provided prompt for composition
 */
export async function generateWithReference(
  prompt: string,
  referenceBase64: string,
  referenceMimeType: string = 'image/jpeg',
  aspectRatio?: string
): Promise<{ base64: string; mimeType: string } | null> {
  const cleanBase64 = referenceBase64.replace(/^data:image\/\w+;base64,/, '');

  const response = await callGeminiAPI(
    IMAGE_MODEL,
    [
      {
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: referenceMimeType,
              data: cleanBase64,
            },
          },
        ],
      },
    ],
    {
      temperature: 0.8,
      responseModalities: ['IMAGE', 'TEXT'],
      ...(aspectRatio && { aspectRatio }),
    }
  );

  return extractImageFromResponse(response);
}

/**
 * Generate an image from text prompt only (no reference image)
 */
export async function generateImageFromPrompt(
  prompt: string,
  aspectRatio?: string
): Promise<{ base64: string; mimeType: string } | null> {
  const response = await callGeminiAPI(
    IMAGE_MODEL,
    [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    {
      temperature: 0.8,
      responseModalities: ['IMAGE', 'TEXT'],
      ...(aspectRatio && { aspectRatio }),
    }
  );

  return extractImageFromResponse(response);
}

/**
 * Generate fashion designs from textile art (HERALBONY flow)
 * Uses textile-specific prompts that preserve artist's vision
 */
export async function generateTextileDesigns(
  referenceImages: { base64: string; mimeType: string }[],
  userPrompt: string,
  count: number = 1,
  options: {
    artistName: string;
    textileTitle: string;
    category: string;
    categoryDescription: string;
  }
): Promise<{ base64: string; mimeType: string }[]> {
  const { artistName, textileTitle, category, categoryDescription } = options;

  const systemPrompt = `あなたはテキスタイルアートをファッションアイテムに適用する専門のAIアシスタントです。
アーティストの作品を尊重しながら、テキスタイルパターンを衣服に美しく適用してください。

[PRIMARY TEXTILE - HERO ELEMENT]
- Artist: ${artistName}
- Artwork: "${textileTitle}"
- This is original artwork - preserve the artist's vision with utmost respect
- The textile pattern is the HERO of the design - the garment is its canvas
- Never distort, unnaturally stretch, or crop the core artistic motif

[TEXTILE APPLICATION - CRITICAL]
- Apply pattern with appropriate scale for the garment type
- Maintain pattern continuity and flow across seams and construction lines
- Consider how the pattern interacts with garment movement and drape
- Pattern should align naturally at seams where possible
- The result should feel like wearable art, not just patterned clothing

[GARMENT CATEGORY]
Category: ${category}
Description: ${categoryDescription}
Generate a design specifically for this garment category. The output must clearly be this type of garment.

[COMPOSITION - CRITICAL]
- MUST show exactly ONE model in FULL-BODY view (head to toe visible)
- Camera angle: straight-on or slight angle, showing entire body from head to feet
- NO close-up shots of garments or details
- NO cropped views (waist-up, torso only, etc.)
- NO flat lay or product-only shots
- NO multiple models or collage layouts
- The model should be centered, standing naturally, with full outfit visible
- Background: clean studio environment, gallery-white or neutral

[STYLING]
- Art-forward, gallery-worthy presentation
- Let the textile art speak - garment silhouette should complement, not compete
- Consider appropriate innerwear and accessories that don't distract from the art
- Model styling should be minimal and elegant

[USER DIRECTION]
${userPrompt}

[ARTIST RESPECT]
- This is original artwork created by an artist with intellectual disabilities
- Honor the artistic intent, visual language, and emotional expression
- The textile is the hero - showcase it with dignity and beauty

[DIVERSITY]
Generate unique variations. Each design should explore different:
- Silhouette interpretations
- Pattern placement and scale
- Color interaction with the textile art
- Construction details that enhance the art

[NEGATIVE]
- NO logos, brand names, monograms, or brand identifiers
- NO text, labels, watermarks, or typography
- NO 3D render look, illustration, or painting style
- NO close-up or detail shots of clothing
- NO cropped or partial body views
- NO flat lay or product-only photography
- NO multiple models or split-screen layouts
- NO distortion of the original textile art
- Must look like a real fashion photograph with single full-body model

ユニークなデザインバリエーションを1つ生成してください。テキスタイルアートの魅力を最大限に引き出すデザインを作成してください。`;

  const parts: GeminiPart[] = [
    { text: systemPrompt },
    ...referenceImages.map((img) => ({
      inlineData: {
        mimeType: img.mimeType,
        data: img.base64.replace(/^data:image\/\w+;base64,/, ''),
      },
    })),
  ];

  const results: { base64: string; mimeType: string }[] = [];

  // Generate images one by one (Gemini generates one at a time)
  for (let i = 0; i < count; i++) {
    try {
      // Add delay between requests to avoid rate limiting (10 req/min limit)
      if (i > 0) {
        await sleep(7000); // 7 seconds between requests
      }

      const response = await callGeminiAPI(
        IMAGE_MODEL,
        [{ role: 'user', parts }],
        {
          temperature: 0.8 + (i * 0.05), // Slightly vary temperature for diversity
          responseModalities: ['IMAGE', 'TEXT'],
        }
      );

      const image = extractImageFromResponse(response);
      if (image) {
        results.push(image);
      }
    } catch (error) {
      console.error(`Error generating textile design ${i + 1}:`, error);
      // If rate limited, wait longer before next attempt
      if (error instanceof Error && error.message.includes('429')) {
        await sleep(60000); // Wait 60 seconds on rate limit
      }
    }
  }

  return results;
}

/**
 * Generate a text description/inspiration based on reference images
 */
export async function generateInspiration(
  referenceImages: { base64: string; mimeType: string }[]
): Promise<string> {
  const prompt = `これらのファッション画像を分析し、新しいコレクションのインスピレーションテキストを生成してください。

以下の形式で出力してください:
- コレクションコンセプト（2-3文）
- キーワード（5-8個）
- 推奨されるデザイン方向性（3-5点）

日本語で回答してください。`;

  const parts: GeminiPart[] = [
    { text: prompt },
    ...referenceImages.map((img) => ({
      inlineData: {
        mimeType: img.mimeType,
        data: img.base64.replace(/^data:image\/\w+;base64,/, ''),
      },
    })),
  ];

  const response = await callGeminiAPI(
    TEXT_MODEL,
    [{ role: 'user', parts }],
    { temperature: 0.8, maxOutputTokens: 1024 }
  );

  return extractTextFromResponse(response);
}
