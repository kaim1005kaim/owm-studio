/**
 * MAISON SPECIAL client configuration
 * Dark theme, fashion-focused, moodboard-based workflow
 */

import type { ClientConfig, CategoryConfig } from './index';

// Garment categories with descriptions for AI prompt generation
const categories: CategoryConfig[] = [
  { id: 'cutsew', labelJa: 'カットソー', labelEn: 'Cut & Sew', description: 'Cut-and-sewn jersey top (T-shirt, long sleeve tee, henley, polo). Soft knit fabric, casual construction.', enabled: true },
  { id: 'sweat', labelJa: 'スウェット', labelEn: 'Sweat', description: 'Sweatshirt or hoodie (crew neck sweat, pullover hoodie, zip hoodie). Fleece-lined, relaxed fit.', enabled: true },
  { id: 'knit', labelJa: 'ニット', labelEn: 'Knit', description: 'Knitted top (sweater, cardigan, turtleneck, pullover). Visible knit texture.', enabled: true },
  { id: 'shirt', labelJa: 'シャツ', labelEn: 'Shirt', description: 'Button-front top (dress shirt, casual shirt, overshirt). Collar and cuffs visible.', enabled: true },
  { id: 'blouse', labelJa: 'ブラウス', labelEn: 'Blouse', description: 'Feminine top (blouse, bow-tie blouse, peplum top). Lightweight fabric, elegant drape.', enabled: true },
  { id: 'vest', labelJa: 'ベスト', labelEn: 'Vest', description: 'Sleeveless outerwear or layering piece (gilet, vest, waistcoat). Shows innerwear sleeves.', enabled: true },
  { id: 'onepiece', labelJa: 'ワンピース', labelEn: 'One Piece', description: 'Full-body garment (dress, jumpsuit, romper). Head-to-toe single piece.', enabled: true },
  { id: 'coat', labelJa: 'コート', labelEn: 'Coat', description: 'Long outerwear (overcoat, trench coat, duffle coat, chester coat). Mid-thigh to ankle length.', enabled: true },
  { id: 'blouson', labelJa: 'ブルゾン', labelEn: 'Blouson', description: 'Short outerwear (bomber jacket, MA-1, blouson, windbreaker). Waist to hip length with elastic/ribbed hem.', enabled: true },
  { id: 'jacket', labelJa: 'ジャケット', labelEn: 'Jacket', description: 'Tailored or structured outerwear (blazer, tailored jacket, safari jacket). Hip length.', enabled: true },
  { id: 'pants', labelJa: 'パンツ', labelEn: 'Pants', description: 'Lower body (trousers, wide-leg pants, cargo pants, joggers). Full leg visible.', enabled: true },
  { id: 'skirt', labelJa: 'スカート', labelEn: 'Skirt', description: 'Lower body (midi skirt, maxi skirt, mini skirt, pleated skirt). Show movement and drape.', enabled: true },
  { id: 'bag', labelJa: 'バッグ', labelEn: 'Bag', description: 'Bag or carry accessory (tote bag, backpack, shoulder bag, clutch). Show shape, material, and hardware details.', enabled: true },
  { id: 'accessory', labelJa: 'アクセサリー', labelEn: 'Accessory', description: 'Fashion accessory (hat, scarf, belt, jewelry, sunglasses, gloves). Show detail and styling context.', enabled: true },
  { id: 'shoes', labelJa: 'シューズ', labelEn: 'Shoes', description: 'Footwear (sneakers, boots, loafers, heels, sandals). Show silhouette, sole, and material details.', enabled: true },
];

export const maisonSpecialConfig: ClientConfig = {
  // Identity
  id: 'maison-special',
  workspaceSlug: 'maison_demo',
  brandName: 'MAISON SPECIAL',
  brandNameEn: 'MAISON SPECIAL',
  tagline: 'DESIGN STUDIO',
  logoText: 'MS',

  // Theme - Dark cyberpunk aesthetic
  theme: {
    mode: 'dark',
    background: '#050505',
    foreground: '#E0E0E0',
    cardBackground: '#1A1A1A',
    textSecondary: '#A0A0A0',
    textInactive: '#555555',
    accentPrimary: '#00FFFF',    // Cyan
    accentSecondary: '#FFBF00',  // Amber
    accentDanger: '#DC143C',     // Crimson
  },

  fonts: {
    primary: 'var(--font-geist-sans), Helvetica Neue, sans-serif',
    secondary: 'var(--font-geist-mono), monospace',
  },

  // Features
  features: {
    moodboards: true,
    textileLibrary: false,
    additionalReferences: false,
    artistAttribution: false,
  },

  // Categories
  categories,

  // Generation settings
  generation: {
    defaultCount: 4,
    maxReferences: 8,
    promptTemplates: [
      { id: 'tech', label: 'Tech', prompt: 'Technical fabric, functional details, urban utility aesthetic, performance materials' },
      { id: 'mode', label: 'Mode', prompt: 'High fashion, editorial quality, avant-garde silhouettes, runway-ready design' },
      { id: 'street', label: 'Street', prompt: 'Streetwear influence, bold graphics potential, youth culture, relaxed proportions' },
      { id: 'minimal', label: 'Minimal', prompt: 'Clean lines, subtle details, timeless design, quality focus, understated elegance' },
      { id: 'classic', label: 'Classic', prompt: 'Traditional tailoring, heritage inspiration, refined construction, elegant proportions' },
    ],
  },

  // Navigation
  navigation: [
    { href: '/library', label: 'LIBRARY' },
    { href: '/board', label: 'MOODBOARD' },
  ],

  // Content strings
  content: {
    homeTitle: 'MAISON SPECIAL Design Studio',
    homeDescription: 'AIを活用したファッションデザイン生成ツール',
    homeTagline: 'リファレンス画像から新しいデザインを創造',
    libraryTitle: 'LIBRARY',
    libraryDescription: 'デザイン生成のための参照画像アーカイブ',
    generateTitle: 'GENERATE',
    workflowSteps: ['アップロード', 'ムードボード', 'デザイン生成', '再編集'],
  },
};

export default maisonSpecialConfig;
