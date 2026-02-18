/**
 * Multi-client configuration system
 * Allows the same codebase to serve different clients with unique branding and features
 */

// Theme configuration
export interface ThemeConfig {
  mode: 'dark' | 'light' | 'neutral';
  background: string;
  foreground: string;
  cardBackground: string;
  textSecondary: string;
  textInactive: string;
  accentPrimary: string;
  accentSecondary: string;
  accentDanger: string;
}

// Feature flags for client-specific functionality
export interface FeatureFlags {
  moodboards: boolean;
  textileLibrary: boolean;
  additionalReferences: boolean;
  artistAttribution: boolean;
  viewGeneration?: boolean;  // Ghost mannequin / flat lay 3-view
}

// Category configuration
export interface CategoryConfig {
  id: string;
  labelJa: string;
  labelEn: string;
  description: string;
  enabled: boolean;
}

// Prompt template
export interface PromptTemplate {
  id: string;
  label: string;
  prompt: string;
}

// Navigation item
export interface NavItem {
  href: string;
  label: string;
}

// Content strings for localization
export interface ContentStrings {
  homeTitle: string;
  homeDescription: string;
  homeTagline?: string;
  libraryTitle: string;
  libraryDescription: string;
  generateTitle: string;
  workflowSteps: string[];
}

// Generation configuration
export interface GenerationConfig {
  defaultCount: number;
  maxReferences: number;
  aspectRatio?: string;  // e.g., '9:16', '4:5'
  promptTemplates: PromptTemplate[];
  systemPromptOverrides?: string;
}

// Main client configuration interface
export interface ClientConfig {
  // Identity
  id: string;
  workspaceSlug: string;
  brandName: string;
  brandNameEn: string;
  tagline: string;
  logoText: string;

  // Branding
  theme: ThemeConfig;
  fonts: {
    primary: string;
    secondary: string;
  };

  // Features
  features: FeatureFlags;

  // Categories (MD)
  categories: CategoryConfig[];

  // Generation
  generation: GenerationConfig;

  // Navigation
  navigation: NavItem[];

  // Content
  content: ContentStrings;
}

// Client configurations map
const clients: Record<string, () => Promise<{ default: ClientConfig }>> = {
  'maison-special': () => import('./maison-special'),
  'heralbony': () => import('./heralbony'),
};

// Default client ID
const DEFAULT_CLIENT_ID = 'maison-special';

// Get client ID from environment or default
export function getClientId(): string {
  if (typeof window !== 'undefined') {
    // Client-side: use NEXT_PUBLIC_ env var
    return process.env.NEXT_PUBLIC_CLIENT_ID || DEFAULT_CLIENT_ID;
  }
  // Server-side
  return process.env.NEXT_PUBLIC_CLIENT_ID || DEFAULT_CLIENT_ID;
}

// Synchronous config loader (for initial render)
// Must be imported statically to work with SSR
import { maisonSpecialConfig } from './maison-special';
import { heralbonyConfig } from './heralbony';

const configMap: Record<string, ClientConfig> = {
  'maison-special': maisonSpecialConfig,
  'heralbony': heralbonyConfig,
};

export function getClientConfig(clientId?: string): ClientConfig {
  const id = clientId || getClientId();
  return configMap[id] || configMap[DEFAULT_CLIENT_ID];
}

// Export configs for direct import
export { maisonSpecialConfig } from './maison-special';
export { heralbonyConfig } from './heralbony';
