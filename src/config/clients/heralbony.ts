/**
 * HERALBONY client configuration
 * Light/neutral theme, art-focused, textile-first workflow
 * Brand: Works with artists with intellectual disabilities
 */

import type { ClientConfig, CategoryConfig } from './index';

// Garment categories with textile-application focused descriptions
const categories: CategoryConfig[] = [
  { id: 'shirt', labelJa: 'シャツ', labelEn: 'Shirt', description: 'Apply textile pattern to button-front shirt. Maintain pattern scale across front panels, collar, and cuffs. Pattern should align at seams.', enabled: true },
  { id: 'blouse', labelJa: 'ブラウス', labelEn: 'Blouse', description: 'Apply textile pattern to feminine blouse. Consider pattern flow with draping fabric. Elegant presentation.', enabled: true },
  { id: 'onepiece', labelJa: 'ワンピース', labelEn: 'Dress', description: 'Apply textile pattern to full-length dress. Pattern should flow continuously from bodice to skirt. Consider movement.', enabled: true },
  { id: 'coat', labelJa: 'コート', labelEn: 'Coat', description: 'Apply textile pattern to outerwear coat. Large surface area allows full pattern expression. Consider lining contrast.', enabled: true },
  { id: 'jacket', labelJa: 'ジャケット', labelEn: 'Jacket', description: 'Apply textile pattern to structured jacket. Balance pattern with tailored construction. Consider pocket and lapel placement.', enabled: true },
  { id: 'knit', labelJa: 'ニット', labelEn: 'Knit', description: 'Apply textile pattern as knit/jacquard design. Pattern adapts to knit texture. Cozy, artistic expression.', enabled: true },
  { id: 'pants', labelJa: 'パンツ', labelEn: 'Pants', description: 'Apply textile pattern to trousers. Pattern should flow down legs naturally. Consider scale for leg width.', enabled: true },
  { id: 'skirt', labelJa: 'スカート', labelEn: 'Skirt', description: 'Apply textile pattern to skirt. Pattern enhances movement and silhouette. Show full pattern repeat.', enabled: true },
  { id: 'bag', labelJa: 'バッグ', labelEn: 'Bag', description: 'Apply textile pattern to bag accessory. Pattern as hero element on structured form. Show craftsmanship.', enabled: true },
  { id: 'accessory', labelJa: 'スカーフ/小物', labelEn: 'Scarf/Accessory', description: 'Apply textile pattern to scarf or accessory. Full pattern expression, luxurious presentation.', enabled: true },
];

export const heralbonyConfig: ClientConfig = {
  // Identity
  id: 'heralbony',
  workspaceSlug: 'heralbony_demo',
  brandName: 'HERALBONY',
  brandNameEn: 'HERALBONY',
  tagline: '異彩を、放て。',
  logoText: 'H',

  // Theme - Art-gallery neutral aesthetic
  theme: {
    mode: 'neutral',
    background: '#FAFAFA',
    foreground: '#1A1A1A',
    cardBackground: '#FFFFFF',
    textSecondary: '#666666',
    textInactive: '#BBBBBB',
    accentPrimary: '#1A1A1A',    // Black
    accentSecondary: '#8B7355',  // Earthy brown
    accentDanger: '#C45B4D',     // Muted red
  },

  fonts: {
    primary: '"Noto Serif JP", "Hiragino Mincho ProN", serif',
    secondary: 'Inter, "Helvetica Neue", sans-serif',
  },

  // Features
  features: {
    moodboards: false,           // Not primary flow
    textileLibrary: true,        // PRIMARY entry point
    additionalReferences: true,  // Upload during generation
    artistAttribution: true,     // Show artist name on textiles
  },

  // Categories (textile-focused)
  categories,

  // Generation settings
  generation: {
    defaultCount: 4,
    maxReferences: 6,  // Primary textile + up to 5 additional
    promptTemplates: [
      { id: 'classic', label: 'クラシック', prompt: 'Classic tailoring with artistic textile as hero. Refined silhouette, let the art speak through quality construction.' },
      { id: 'casual', label: 'カジュアル', prompt: 'Relaxed everyday style featuring the artistic textile. Comfortable fit, pattern prominence, approachable fashion.' },
      { id: 'statement', label: 'ステートメント', prompt: 'Bold statement piece where the art commands attention. Striking silhouette, gallery-worthy presentation.' },
      { id: 'minimal', label: 'ミニマル', prompt: 'Minimal design that frames the textile art elegantly. Clean lines, strategic pattern placement, quiet sophistication.' },
    ],
    systemPromptOverrides: `
[TEXTILE APPLICATION - CRITICAL]
- The provided textile/art pattern is original artwork - preserve the artist's vision with utmost respect
- Apply pattern with appropriate scale for the garment type
- Maintain pattern continuity and flow across seams and construction lines
- Consider how the pattern interacts with garment movement and drape
- Never distort, stretch unnaturally, or crop the core artistic motif

[ARTIST RESPECT]
- This is original artwork created by artists with intellectual disabilities
- The textile is the hero of the design - the garment is its canvas
- Honor the artistic intent, visual language, and emotional expression
- The result should feel like wearable art, not just patterned clothing
    `.trim(),
  },

  // Navigation
  navigation: [
    { href: '/textiles', label: 'TEXTILES' },
    { href: '/create', label: 'CREATE' },
  ],

  // Content strings
  content: {
    homeTitle: 'HERALBONY Design Studio',
    homeDescription: 'アーティストのテキスタイルを、ファッションへ',
    homeTagline: '異彩を、放て。',
    libraryTitle: 'TEXTILE GALLERY',
    libraryDescription: 'アーティストの作品からインスピレーションを選ぶ',
    generateTitle: 'CREATE',
    workflowSteps: ['テキスタイル選択', '参照追加', 'カテゴリ選択', 'デザイン生成'],
  },
};

export default heralbonyConfig;
