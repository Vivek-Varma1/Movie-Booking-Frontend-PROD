const record = (value: unknown): Record<string, unknown> | undefined => typeof value === 'object' && value !== null ? value as Record<string, unknown> : undefined;
function messages(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(messages);
  const obj = record(value);
  if (!obj) return [];
  const message = obj['defaultMessage'] ?? obj['message'];
  if (typeof message === 'string') return [typeof obj['field'] === 'string' ? `${obj['field']}: ${message}` : message];
  return Object.entries(obj).flatMap(([field, text]) => messages(text).map(m => `${field}: ${m}`));
}
export function getApiErrorMessage(error: unknown): string {
  const response = record(record(error)?.['response']);
  if (!response) return 'Cannot reach the server (check API URL / CORS)';
  const body = record(response['data']);
  const details = messages(body?.['errors'] ?? body?.['fieldErrors']);
  const main = [body?.['message'], body?.['error'], body?.['detail']].find(v => typeof v === 'string' && v.length > 0);
  if (main || details.length) return [main, ...details].filter(Boolean).join('; ');
  const status = Number(response['status']);
  if (status >= 500) return 'Server error, try again';
  return ({400:'Invalid data',403:"You don't have permission",404:'Not found',409:'Conflict: item already exists or is in use',413:'File too large',415:'Unsupported file format'} as Record<number,string>)[status] ?? 'Request failed';
}
