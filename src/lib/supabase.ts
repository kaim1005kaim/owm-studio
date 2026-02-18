import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[supabase] Missing env: ${name}`);
  return v;
}

/**
 * サーバー側で使う（Route Handler / Server Action / RSC）
 * ※ import 時点で createClient しないのがポイント
 */
export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const url = mustGetEnv('SUPABASE_URL');
  const serviceKey = mustGetEnv('SUPABASE_SERVICE_ROLE_KEY');

  _client = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _client;
}

// Helper to get workspace by slug
export async function getWorkspaceBySlug(slug: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error) throw error;
  return data;
}

// Workspace configuration map
const WORKSPACE_CONFIG: Record<string, { name: string }> = {
  maison_demo: { name: 'MAISON SPECIAL Demo' },
  heralbony_demo: { name: 'HERALBONY Demo' },
};

// Helper to get or create workspace by slug
export async function getOrCreateWorkspace(slug: string) {
  const supabase = getSupabase();

  const { data: existing } = await supabase
    .from('workspaces')
    .select('*')
    .eq('slug', slug)
    .single();

  if (existing) return existing;

  // Create workspace with configured name, or use slug as fallback
  const config = WORKSPACE_CONFIG[slug] || { name: slug };

  const { data: created, error } = await supabase
    .from('workspaces')
    .insert({
      slug,
      name: config.name,
    })
    .select()
    .single();

  if (error) throw error;
  return created;
}

// Helper to get or create demo workspace (legacy - uses maison_demo)
export async function getOrCreateDemoWorkspace() {
  const slug = process.env.DEMO_WORKSPACE_SLUG || 'maison_demo';
  return getOrCreateWorkspace(slug);
}
