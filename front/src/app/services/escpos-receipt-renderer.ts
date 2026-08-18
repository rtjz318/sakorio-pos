export interface EscposReceiptPayload {
  receipt_type?: string;
  station_name?: string;
  order_id?: number | string;
  table_name?: string;
  customer_name?: string;
  submitted_at?: string;
  currency_code?: string;
  items?: Array<{
    quantity?: number;
    name?: string;
    line_total_cents?: number;
    customization?: string | null;
    modifiers?: string | null;
    notes?: string | null;
  }>;
  order_notes?: string;
  subtotal_cents?: number;
  tip_cents?: number;
  total_cents?: number;
  payment_method?: string;
}

const RECEIPT_WIDTH = 42;

export function renderEscposReceipt(payload: EscposReceiptPayload): Uint8Array {
  const text = receiptText(payload).replace(/\n/g, '\r\n');
  const encoded = new TextEncoder().encode(text);
  return concatBytes(
    new Uint8Array([0x1b, 0x40]), // initialize
    new Uint8Array([0x1b, 0x61, 0x00]), // left align
    encoded,
    new TextEncoder().encode('\r\n\r\n\r\n'),
    new Uint8Array([0x1d, 0x56, 0x00]), // full cut
  );
}

export function receiptText(payload: EscposReceiptPayload): string {
  const rows = [
    center(payload.receipt_type || 'KITCHEN', RECEIPT_WIDTH),
    center(payload.station_name || 'Kitchen', RECEIPT_WIDTH),
    '='.repeat(RECEIPT_WIDTH),
    `ORDER #${payload.order_id ?? ''}`,
    `TABLE: ${payload.table_name || 'Counter'}`,
  ];
  if (payload.customer_name) rows.push(`GUEST: ${payload.customer_name}`);
  rows.push(`TIME: ${payload.submitted_at || ''}`, '-'.repeat(RECEIPT_WIDTH));

  const isCustomer = String(payload.receipt_type || '').toUpperCase() === 'CUSTOMER RECEIPT';
  for (const item of payload.items || []) {
    const itemLabel = `${item.quantity || 1} x ${item.name || ''}`;
    if (isCustomer) {
      const lineTotal = money(item.line_total_cents, payload.currency_code);
      const labelWidth = Math.max(8, RECEIPT_WIDTH - lineTotal.length - 1);
      rows.push(`${clipped(itemLabel, labelWidth).padEnd(labelWidth)} ${lineTotal}`);
    } else {
      rows.push(...wrap(itemLabel, RECEIPT_WIDTH));
    }
    for (const detail of [item.customization, item.modifiers, item.notes]) {
      if (detail) rows.push(...wrap(`  ${detail}`, RECEIPT_WIDTH));
    }
    rows.push('');
  }

  if (payload.order_notes) {
    rows.push('ORDER NOTE', ...wrap(payload.order_notes, RECEIPT_WIDTH), '');
  }

  if (isCustomer) {
    const currency = payload.currency_code;
    rows.push('-'.repeat(RECEIPT_WIDTH));
    rows.push(`${'SUBTOTAL'.padEnd(18)}${money(payload.subtotal_cents, currency).padStart(24)}`);
    if ((payload.tip_cents || 0) > 0) {
      rows.push(`${'TIP'.padEnd(18)}${money(payload.tip_cents, currency).padStart(24)}`);
    }
    rows.push(`${'TOTAL'.padEnd(18)}${money(payload.total_cents, currency).padStart(24)}`);
    rows.push(`PAID VIA: ${(payload.payment_method || 'Paid').replace(/_/g, ' ').toUpperCase()}`);
    rows.push('', center('THANK YOU', RECEIPT_WIDTH));
  }

  rows.push('='.repeat(RECEIPT_WIDTH), '');
  return rows.join('\n');
}

function clipped(value: unknown, width: number): string {
  const text = String(value || '').trim();
  return text.length <= width ? text : `${text.slice(0, width - 3)}...`;
}

function wrap(value: unknown, width: number): string[] {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let current = words.shift() || '';
  for (const word of words) {
    if (current.length + word.length + 1 <= width) {
      current += ` ${word}`;
    } else {
      lines.push(clipped(current, width));
      current = word;
    }
  }
  lines.push(clipped(current, width));
  return lines;
}

function center(value: unknown, width: number): string {
  const text = clipped(value, width);
  const left = Math.max(0, Math.floor((width - text.length) / 2));
  return `${' '.repeat(left)}${text}`;
}

function money(cents: unknown, currencyCode: unknown): string {
  const amount = Number(cents || 0) / 100;
  const currency = String(currencyCode || 'SGD').toUpperCase();
  return `${currency} ${Number.isFinite(amount) ? amount.toFixed(2) : '0.00'}`;
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    combined.set(part, offset);
    offset += part.length;
  }
  return combined;
}
