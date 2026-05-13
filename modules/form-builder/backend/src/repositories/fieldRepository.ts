import { queryAll, queryOne, execute } from '../db/query';
import { TfFormFieldRow, FieldType } from '../types';

export function findById(id: number): TfFormFieldRow | undefined {
  return queryOne<TfFormFieldRow>('SELECT * FROM tf_form_fields WHERE id = ?', [id]);
}

export function findByFormId(formId: number): TfFormFieldRow[] {
  return queryAll<TfFormFieldRow>(
    'SELECT * FROM tf_form_fields WHERE form_id = ? ORDER BY display_order ASC',
    [formId]
  );
}

export function findByFormIdAndKey(formId: number, fieldKey: string): TfFormFieldRow | undefined {
  return queryOne<TfFormFieldRow>(
    'SELECT * FROM tf_form_fields WHERE form_id = ? AND field_key = ?',
    [formId, fieldKey]
  );
}

export function insert(
  formId: number,
  fieldKey: string,
  label: string,
  fieldType: FieldType,
  required: number,
  optionsJson: string | null,
  displayOrder: number
): number {
  const { lastInsertRowid } = execute(
    'INSERT INTO tf_form_fields (form_id, field_key, label, field_type, required, options_json, display_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [formId, fieldKey, label, fieldType, required, optionsJson, displayOrder]
  );
  return lastInsertRowid;
}

export function update(
  id: number,
  fields: { label?: string; fieldType?: FieldType; required?: number; optionsJson?: string | null; displayOrder?: number }
): void {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (fields.label !== undefined) { sets.push('label = ?'); params.push(fields.label); }
  if (fields.fieldType !== undefined) { sets.push('field_type = ?'); params.push(fields.fieldType); }
  if (fields.required !== undefined) { sets.push('required = ?'); params.push(fields.required); }
  if (fields.optionsJson !== undefined) { sets.push('options_json = ?'); params.push(fields.optionsJson); }
  if (fields.displayOrder !== undefined) { sets.push('display_order = ?'); params.push(fields.displayOrder); }
  if (sets.length === 0) return;
  params.push(id);
  execute(`UPDATE tf_form_fields SET ${sets.join(', ')} WHERE id = ?`, params);
}

export function getMaxDisplayOrder(formId: number): number {
  const row = queryOne<{ mx: number }>('SELECT MAX(display_order) as mx FROM tf_form_fields WHERE form_id = ?', [formId]);
  return row?.mx ?? 0;
}
