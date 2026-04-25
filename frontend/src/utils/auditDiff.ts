import { AuditLog } from '../types';

export const FIELD_LABELS: Record<string, string> = {
  protocolId: 'Protocol ID',
  title: 'Study Name',
  sponsor: 'Sponsor',
  phase: 'Phase',
  startDate: 'Start Date',
  endDate: 'End Date',
  status: 'Status',
  description: 'Description',
  siteCode: 'Site Code',
  name: 'Name',
  city: 'City',
  country: 'Country',
  examinerCode: 'Examiner Code',
  specialty: 'Specialty',
  email: 'Email',
  role: 'Role',
};

export function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key;
}

export function parseJson(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export interface FieldChange {
  field: string;
  before: string;
  after: string;
}

export function diffObjects(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
): FieldChange[] {
  if (!after) return [];
  const skip = new Set(['id', 'password']);
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after)]);
  const changes: FieldChange[] = [];
  for (const key of keys) {
    if (skip.has(key)) continue;
    const bVal = String(before?.[key] ?? '');
    const aVal = String(after[key] ?? '');
    if (bVal !== aVal) changes.push({ field: key, before: bVal, after: aVal });
  }
  return changes;
}

export function summaryText(log: AuditLog): string {
  if (log.action === 'CREATE') return 'Record created';
  const changes = diffObjects(parseJson(log.beforeJson), parseJson(log.afterJson));
  if (changes.length === 0) return 'No changes';
  return changes.map((c) => fieldLabel(c.field)).join(', ') + ' updated';
}
