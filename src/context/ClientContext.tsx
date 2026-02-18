'use client';

import { createContext, useContext, ReactNode, useMemo } from 'react';
import { ClientConfig, getClientConfig, getClientId } from '@/config/clients';

// Context for client configuration
const ClientContext = createContext<ClientConfig | null>(null);

interface ClientProviderProps {
  children: ReactNode;
  clientId?: string;
}

/**
 * Provider component that wraps the app with client configuration
 */
export function ClientProvider({ children, clientId }: ClientProviderProps) {
  const config = useMemo(() => {
    return getClientConfig(clientId);
  }, [clientId]);

  return (
    <ClientContext.Provider value={config}>
      {children}
    </ClientContext.Provider>
  );
}

/**
 * Hook to access client configuration
 * Must be used within a ClientProvider
 */
export function useClient(): ClientConfig {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useClient must be used within a ClientProvider');
  }
  return context;
}

/**
 * Hook to check if a feature is enabled for the current client
 */
export function useFeature(featureName: keyof ClientConfig['features']): boolean {
  const client = useClient();
  return client.features[featureName] ?? false;
}

/**
 * Hook to get theme configuration
 */
export function useTheme() {
  const client = useClient();
  return client.theme;
}

/**
 * Hook to get workspace slug for API calls
 */
export function useWorkspaceSlug(): string {
  const client = useClient();
  return client.workspaceSlug;
}

/**
 * Hook to get categories for the current client
 */
export function useCategories() {
  const client = useClient();
  return client.categories.filter(cat => cat.enabled);
}

/**
 * Hook to get prompt templates for the current client
 */
export function usePromptTemplates() {
  const client = useClient();
  return client.generation.promptTemplates;
}

/**
 * Hook to get navigation items for the current client
 */
export function useNavigation() {
  const client = useClient();
  return client.navigation;
}

/**
 * Hook to get content strings for the current client
 */
export function useContent() {
  const client = useClient();
  return client.content;
}

// Re-export for convenience
export { getClientId, getClientConfig };
