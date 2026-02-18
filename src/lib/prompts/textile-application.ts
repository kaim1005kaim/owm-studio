/**
 * Textile Application Prompts for HERALBONY
 *
 * These prompts are designed to apply textile art to garments
 * while respecting the artist's vision and the artwork's integrity.
 */

export interface TextilePromptOptions {
  artistName: string;
  textileTitle: string;
  garmentCategory: string;
  categoryDescription: string;
  userPrompt?: string;
}

/**
 * Build a system prompt for textile-to-garment generation
 */
export function buildTextileDesignPrompt(options: TextilePromptOptions): string {
  const { artistName, textileTitle, garmentCategory, categoryDescription, userPrompt } = options;

  return `あなたはテキスタイルアートをファッションアイテムに適用する専門のAIアシスタントです。
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
Category: ${garmentCategory}
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

${userPrompt ? `[USER DIRECTION]\n${userPrompt}\n` : ''}
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
}

/**
 * Build a prompt for generating inspiration text based on textile art
 */
export function buildTextileInspirationPrompt(artistName: string, textileTitle: string): string {
  return `このテキスタイルアートを分析し、ファッションデザインのインスピレーションを生成してください。

アーティスト: ${artistName}
作品名: "${textileTitle}"

以下の形式で出力してください:
- アートの特徴分析（2-3文）
- 推奨されるシルエット方向性（2-3点）
- 素材・質感の提案（2-3点）
- カラーパレットの活用方法

アーティストの表現を尊重し、テキスタイルが主役となるデザイン提案をしてください。
日本語で回答してください。`;
}

/**
 * Default prompt templates for Heralbony textile application
 */
export const TEXTILE_PROMPT_TEMPLATES = [
  {
    id: 'classic',
    label: 'クラシック',
    prompt: 'Classic tailoring with artistic textile as hero. Refined silhouette, let the art speak through quality construction.',
  },
  {
    id: 'casual',
    label: 'カジュアル',
    prompt: 'Relaxed everyday style featuring the artistic textile. Comfortable fit, pattern prominence, approachable fashion.',
  },
  {
    id: 'statement',
    label: 'ステートメント',
    prompt: 'Bold statement piece where the art commands attention. Striking silhouette, gallery-worthy presentation.',
  },
  {
    id: 'minimal',
    label: 'ミニマル',
    prompt: 'Minimal design that frames the textile art elegantly. Clean lines, strategic pattern placement, quiet sophistication.',
  },
];
