declare module '*/scripts/fetchData.mjs' {
  export function getAuthHeaders(): Record<string, string>;
  export function getRawHeaders(): Record<string, string>;
  export function fetchWithRetry(
    url: string,
    headers: Record<string, string | undefined>,
    maxRetries?: number,
    options?: {
      allowAuthFallback?: boolean;
      onAuthFallback?: () => void;
      silentFallback?: boolean;
      timeoutMs?: number;
      signal?: AbortSignal;
    }
  ): Promise<unknown>;
  export function normalizeMigrationStatus(raw: unknown): string;
  export function normalizePRStatus(raw: unknown): string;
  export function normalizePluginKey(name: unknown): string;
  export function validateMigrationRecord(
    migration: unknown,
    index?: number
  ): { valid: true; migration: Record<string, unknown> } | { valid: false; reason: string };
  export function validatePluginReport(
    data: unknown,
    filePath?: string,
    seenPluginNames?: Set<string>
  ): {
    valid: true;
    plugin: { pluginName: string; pluginRepository: string; migrations: Record<string, unknown>[] };
    invalidMigrationsCount: number;
    totalMigrationsCount: number;
    hasZeroMigrations?: boolean;
  } | { valid: false; reason: string };
  export function normalizeEol(content: unknown): string;
  export function computeDatasetHash(content: string): string;
  export function run(): Promise<void>;
}

declare module '*/scripts/verifyData.mjs' {
  export function normalizeEol(content: unknown): string;
  export function computeDatasetHash(content: string): string;
  export function normalizePluginKey(name: unknown): string;
  export function verifyDatasetFiles(options?: {
    dataDir?: string;
    outputFile?: string;
    manifestFile?: string;
  }): Promise<{
    success: boolean;
    count: number;
    sha256: string;
    manifest: Record<string, unknown>;
  }>;
}
