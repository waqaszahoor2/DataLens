/**
 * DuckDB WASM placeholder for DataLens.
 *
 * The current implementation uses a JavaScript query runner in QueryEditor.tsx.
 * Full DuckDB WASM can be enabled by:
 * 1. Installing: npm install @duckdb/duckdb-wasm
 * 2. Adding COOP/COEP headers in next.config.mjs for SharedArrayBuffer support
 * 3. Uncomment the implementation below
 *
 * NOTE for Vercel deployment, add headers to next.config.mjs:
 *   async headers() {
 *     return [{ source: '/(.*)', headers: [
 *       { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
 *       { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
 *     ]}];
 *   }
 */

export type DuckDBInstance = {
  query: (sql: string) => Promise<{ rows: Record<string, unknown>[]; schema: { name: string; type: string }[] }>;
  loadData: (tableName: string, data: Record<string, unknown>[]) => Promise<void>;
  close: () => void;
};

/**
 * Get DuckDB WASM instance (returns null in current configuration).
 * To enable: install @duckdb/duckdb-wasm and uncomment the full implementation.
 */
export async function getDB(): Promise<DuckDBInstance | null> {
  if (typeof window === "undefined") return null;

  // DuckDB WASM is not installed in the current configuration.
  // The JS query engine in QueryEditor.tsx handles SQL queries.
  return null;
}

export function resetDB() {
  // No-op in current configuration
}
