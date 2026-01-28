// Asset types
export type AssetKind = 'reference' | 'generated';
export type AssetSource = 'seed' | 'user_upload' | 'generated';
export type AssetStatus = 'processing' | 'ready' | 'failed';

export interface Asset {
  id: string;
  workspace_id: string;
  kind: AssetKind;
  source: AssetSource;
  status: AssetStatus;
  r2_key: string;
  thumb_r2_key?: string;
  mime?: string;
  width?: number;
  height?: number;
  sha256?: string;
  title?: string;
  notes?: string;
  collection?: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AssetAnnotation {
  asset_id: string;
  caption?: string;
  tags: string[];
  silhouette?: string;
  material?: string;
  pattern?: string;
  details?: string;
  mood?: string;
  color_palette: string[];
  raw: Record<string, unknown>;
  updated_at: string;
}

export interface AssetWithAnnotation extends Asset {
  annotation?: AssetAnnotation;
}

// Workspace
export interface Workspace {
  id: string;
  slug: string;
  name: string;
  created_at: string;
}

// Moodboard
export interface Board {
  id: string;
  workspace_id: string;
  name: string;
  created_at: string;
}

export interface BoardItem {
  board_id: string;
  asset_id: string;
  position: number;
}

export interface BoardWithAssets extends Board {
  assets: AssetWithAnnotation[];
}

// Generation
export interface Generation {
  id: string;
  workspace_id: string;
  board_id?: string;
  prompt: string;
  model: string;
  config: {
    aspectRatio?: string;
    imageSize?: string;
    count?: number;
  };
  created_at: string;
}

export interface GenerationOutput {
  id: string;
  generation_id: string;
  asset_id: string;
  score: number;
  liked: boolean;
  notes?: string;
  created_at: string;
  asset?: Asset;
}

export interface GenerationWithOutputs extends Generation {
  outputs: GenerationOutput[];
}

// Edit history
export interface Edit {
  id: string;
  workspace_id: string;
  parent_asset_id: string;
  child_asset_id: string;
  instruction: string;
  model: string;
  created_at: string;
}

export interface EditWithAssets extends Edit {
  parent_asset?: Asset;
  child_asset?: Asset;
}

// Garment categories (MD)
export type GarmentCategory =
  | 'cutsew'
  | 'sweat'
  | 'knit'
  | 'shirt'
  | 'blouse'
  | 'vest'
  | 'onepiece'
  | 'coat'
  | 'blouson'
  | 'jacket'
  | 'pants'
  | 'skirt'
  | 'bag'
  | 'accessory'
  | 'shoes';

export const GARMENT_CATEGORY_LABELS: Record<GarmentCategory, string> = {
  cutsew: 'カットソー',
  sweat: 'スウェット',
  knit: 'ニット',
  shirt: 'シャツ',
  blouse: 'ブラウス',
  vest: 'ベスト',
  onepiece: 'ワンピース',
  coat: 'コート',
  blouson: 'ブルゾン',
  jacket: 'ジャケット',
  pants: 'パンツ',
  skirt: 'スカート',
  bag: 'バッグ',
  accessory: 'アクセサリー',
  shoes: 'シューズ',
};

export const GARMENT_CATEGORY_DESCRIPTIONS: Record<GarmentCategory, string> = {
  cutsew: 'Cut-and-sewn jersey top (T-shirt, long sleeve tee, henley, polo). Soft knit fabric, casual construction.',
  sweat: 'Sweatshirt or hoodie (crew neck sweat, pullover hoodie, zip hoodie). Fleece-lined, relaxed fit.',
  knit: 'Knitted top (sweater, cardigan, turtleneck, pullover). Visible knit texture.',
  shirt: 'Button-front top (dress shirt, casual shirt, overshirt). Collar and cuffs visible.',
  blouse: 'Feminine top (blouse, bow-tie blouse, peplum top). Lightweight fabric, elegant drape.',
  vest: 'Sleeveless outerwear or layering piece (gilet, vest, waistcoat). Shows innerwear sleeves.',
  onepiece: 'Full-body garment (dress, jumpsuit, romper). Head-to-toe single piece.',
  coat: 'Long outerwear (overcoat, trench coat, duffle coat, chester coat). Mid-thigh to ankle length.',
  blouson: 'Short outerwear (bomber jacket, MA-1, blouson, windbreaker). Waist to hip length with elastic/ribbed hem.',
  jacket: 'Tailored or structured outerwear (blazer, tailored jacket, safari jacket). Hip length.',
  pants: 'Lower body (trousers, wide-leg pants, cargo pants, joggers). Full leg visible.',
  skirt: 'Lower body (midi skirt, maxi skirt, mini skirt, pleated skirt). Show movement and drape.',
  bag: 'Bag or carry accessory (tote bag, backpack, shoulder bag, clutch). Show shape, material, and hardware details.',
  accessory: 'Fashion accessory (hat, scarf, belt, jewelry, sunglasses, gloves). Show detail and styling context.',
  shoes: 'Footwear (sneakers, boots, loafers, heels, sandals). Show silhouette, sole, and material details.',
};

// View style for garment spec sheets
export type ViewStyle = 'ghost' | 'flatlay';

// API Request/Response types
export interface UploadRequest {
  workspaceSlug: string;
  source: AssetSource;
  collection?: string;
  title?: string;
}

export interface AnnotateRequest {
  assetId: string;
}

export interface AnnotationResult {
  caption: string;
  tags: string[];
  silhouette: string;
  material: string;
  pattern: string;
  details: string;
  mood: string;
  color_palette: string[];
}

export interface GenerateRequest {
  workspaceSlug: string;
  boardId: string;
  prompt: string;
  count: 4 | 8 | 12;
  aspectRatio: string;
  imageSize: '2K' | '4K';
  category?: GarmentCategory;
}

export interface GenerateViewsRequest {
  workspaceSlug: string;
  assetId: string;
  viewStyle: ViewStyle;
}

export interface GenerateViewsResponse {
  heroAssetId: string;
  heroUrl: string;
  garmentViews: {
    frontAssetId: string;
    frontUrl: string;
    sideAssetId: string;
    sideUrl: string;
    backAssetId: string;
    backUrl: string;
  };
}

export interface EditRequest {
  workspaceSlug: string;
  parentAssetId: string;
  instruction: string;
  aspectRatio?: string;
  imageSize?: '2K' | '4K';
}

// Filter options for Library
export interface LibraryFilters {
  source?: AssetSource[];
  tags?: string[];
  silhouette?: string[];
  material?: string[];
  mood?: string[];
  collection?: string[];
}
