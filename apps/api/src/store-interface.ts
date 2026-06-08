import type { ApiToken, CrawlFailure, CrawlItem, CrawlRun, CrawlTarget } from './types.js'

export interface Store {
  getTargets(enabledOnly?: boolean): Promise<CrawlTarget[]>
  getTarget(id: string): Promise<CrawlTarget | null>
  upsertTarget(target: Omit<CrawlTarget, 'created_at' | 'updated_at'> & { created_at?: string }): Promise<CrawlTarget>
  deleteTarget(id: string): Promise<void>
  addSuccess(run: CrawlRun, items: { pageUrl: string; name: string; value: string }[]): Promise<void>
  addFailure(failure: CrawlFailure): Promise<void>
  getStats(): Promise<{
    totals: Record<string, number>
    last7Days: { day: string; runs: number; successes: number }[]
  }>
  getRuns(limit: number, targetId?: string): Promise<CrawlRun[]>
  getFailures(limit: number): Promise<CrawlFailure[]>
  getItems(runId: string): Promise<CrawlItem[]>
  listTokens(): Promise<Array<Pick<ApiToken, 'id' | 'name' | 'token_prefix' | 'scopes' | 'created_at' | 'last_used_at'>>>
  createToken(name: string, scopes: ApiToken['scopes']): Promise<{ token: string; meta: ApiToken }>
  revokeToken(id: string): Promise<void>
  validateToken(raw: string, requiredScope?: ApiToken['scopes'][number]): Promise<ApiToken | null>
}
