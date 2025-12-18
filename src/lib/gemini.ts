/**
 * Gemini API Client for OWM Biz Demo
 * Uses Google AI Studio API (not Vertex AI) for simplicity
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Model IDs
const TEXT_MODEL = 'gemini-2.0-flash';
const IMAGE_MODEL = 'gemini-2.5-flash-image'; // Image generation capable model

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
  count: number = 1
): Promise<{ base64: string; mimeType: string }[]> {
  const systemPrompt = `あなたはファッションデザインのAIアシスタントです。
参照画像の要素を抽出して「新規デザイン案」を生成してください。

重要なルール:
- ブランドロゴや既存デザインを直接コピーしない
- 参照画像からシルエット、素材感、カラーパレット、ディテールを抽象化して活用
- 出力はファッションルックのプロダクト写真風
- 背景はシンプルな白またはライトグレー
- モデルは全身が見えるように配置
- テキスト、ラベル、透かしを含めない

ユーザーの指示:
${prompt}

${count}個の異なるバリエーションを生成してください。色・素材・ディテール・シルエットを変えて多様性を出してください。`;

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
- モデルは全身が見えるように配置
- テキスト、ラベル、透かしを含めない

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
