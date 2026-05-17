export interface LogEntry {
  operationName?: string | null;
  userId?: string;
  executionTimeMs: number;
  downstreamLatencyMs?: number;
  error?: string;
}

export function logRequest(entry: LogEntry): void {
  const parts = [
    `[gateway]`,
    entry.operationName ? `op=${entry.operationName}` : 'op=unknown',
    entry.userId ? `user=${entry.userId}` : 'user=anonymous',
    `time=${entry.executionTimeMs}ms`,
  ];
  if (entry.downstreamLatencyMs !== undefined) {
    parts.push(`downstream=${entry.downstreamLatencyMs}ms`);
  }
  if (entry.error) {
    parts.push(`error="${entry.error}"`);
  }
  console.log(parts.join(' '));
}
