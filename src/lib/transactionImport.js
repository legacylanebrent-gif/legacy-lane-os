import * as XLSX from 'xlsx';

// Column names we recognize in an uploaded spreadsheet (normalized: lowercase, no punctuation).
const FIELD_ALIASES = {
  name: ['item', 'itemname', 'itemsold', 'name', 'product', 'description', 'itemdescription', 'title', 'whatsold'],
  quantity: ['qty', 'quantity', 'count', 'units', 'pieces', 'num'],
  price: ['price', 'unitprice', 'priceeach', 'each', 'unitamount', 'unitcost'],
  total: ['total', 'totalprice', 'totalamount', 'amount', 'extended', 'linetotal', 'saleprice', 'soldfor', 'revenue', 'subtotal'],
  payment_method: ['payment', 'paymentmethod', 'paymethod', 'method', 'paidwith', 'paytype', 'tender', 'paymenttype'],
  notes: ['notes', 'note', 'comments', 'comment', 'memo', 'remarks', 'detail', 'details'],
  kind: ['type', 'kind', 'saletype', 'itemtype', 'transactiontype', 'bundle', 'singleorbundle', 'listingtype'],
  contents: ['contents', 'bundlecontents', 'bundleitems', 'included', 'includes', 'itemsincluded', 'includeditems', 'components'],
  date: ['date', 'transactiondate', 'solddate', 'saledate', 'datetime', 'timestamp', 'when'],
};

const BUNDLE_WORDS = /\b(bundle|lot|lots|set|sets|group|grouping|collection|assortment|assorted|package|kit|pair|trio|quartet|mixed|multiple|stack|basket|boxlot)\b/i;

const normalizeKey = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

const round2 = (value) => Math.round(value * 100) / 100;

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return null;
  const cleaned = String(value).replace(/[^0-9.\-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.') return null;
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDateValue(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function mapPayment(value) {
  const text = String(value ?? '').toLowerCase();
  if (!text) return 'cash';
  if (text.includes('card') || text.includes('credit') || text.includes('debit') || text.includes('visa') || text.includes('master')) return 'credit_card';
  if (text.includes('venmo')) return 'venmo';
  if (text.includes('zelle')) return 'zelle';
  if (text.includes('check') || text.includes('cheque')) return 'check';
  return 'cash';
}

export function mapHeaders(headers) {
  const mapping = {};
  headers.forEach((header) => {
    const key = normalizeKey(header);
    if (!key) return;
    Object.entries(FIELD_ALIASES).forEach(([field, aliases]) => {
      if (!mapping[field] && aliases.includes(key)) mapping[field] = header;
    });
  });
  return mapping;
}

// Decides whether a row describes one item or several items sold together.
function detectKind({ name, notes, contents, typeValue }) {
  const type = String(typeValue ?? '').toLowerCase();
  if (type) {
    if (/(bundle|lot|set|group|collection|multi|package|assort|kit)/.test(type)) {
      return { kind: 'bundle', reason: `File says "${typeValue}"` };
    }
    if (/(single|individual|one|item)/.test(type)) {
      return { kind: 'single', reason: `File says "${typeValue}"` };
    }
  }
  if (contents) return { kind: 'bundle', reason: 'A list of included items is filled in' };
  if (BUNDLE_WORDS.test(name)) return { kind: 'bundle', reason: 'The name reads as several items' };
  if (BUNDLE_WORDS.test(notes)) return { kind: 'bundle', reason: 'Notes mention a bundle' };
  return { kind: 'single', reason: 'One item' };
}

function pickMoneyColumn(headers, rows, excluded) {
  const candidates = headers.filter((header) => !excluded.has(header));
  const numeric = candidates.filter((header) => {
    const values = rows.map((row) => row[header]).filter((v) => v !== '' && v !== null && v !== undefined);
    if (!values.length) return false;
    const numericCount = values.filter((v) => toNumber(v) !== null).length;
    return numericCount / values.length >= 0.8;
  });
  return numeric[numeric.length - 1] || null;
}

function buildRow(raw, index, columns, source) {
  const name = String(raw[columns.name] ?? '').trim();
  const parsedQuantityRaw = columns.quantity ? toNumber(raw[columns.quantity]) : null;
  const parsedQuantity = parsedQuantityRaw && parsedQuantityRaw > 0 ? Math.max(1, Math.round(parsedQuantityRaw)) : 1;
  const notes = columns.notes ? String(raw[columns.notes] ?? '').trim() : '';
  const contents = columns.contents ? String(raw[columns.contents] ?? '').trim() : '';
  const typeValue = columns.kind ? String(raw[columns.kind] ?? '').trim() : '';
  const priceValue = columns.price ? toNumber(raw[columns.price]) : null;
  const totalValue = columns.total ? toNumber(raw[columns.total]) : null;
  const payment = columns.payment_method ? mapPayment(raw[columns.payment_method]) : 'cash';
  const date = columns.date ? toDateValue(raw[columns.date]) : null;

  const detection = detectKind({ name, notes, contents, typeValue });
  const quantity = detection.kind === 'bundle' ? 1 : parsedQuantity;

  let price = priceValue;
  let total = totalValue;
  if (total === null && price !== null) total = round2(price * quantity);
  if (price === null && total !== null) price = round2(total / quantity);

  let issue = null;
  if (!name) issue = 'Missing item name';
  else if (total === null || price === null) issue = 'Missing price';

  return {
    id: `${source}-${index}`,
    rowNumber: index + 2,
    name,
    quantity,
    parsed_quantity: parsedQuantity,
    price,
    total,
    payment_method: payment,
    notes,
    contents,
    date,
    kind: detection.kind,
    kindReason: detection.reason,
    issue,
  };
}

export async function parseTransactionFile(file) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('That file has no sheets to read.');
  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
  if (!raw.length) throw new Error('That file has no rows to import.');

  const headers = Object.keys(raw[0]);
  const mapping = mapHeaders(headers);
  const used = new Set(Object.values(mapping));

  let nameColumn = mapping.name;
  if (!nameColumn) {
    nameColumn = headers.find((header) => !used.has(header) && header !== mapping.quantity) || headers[0];
  }

  let priceColumn = mapping.price;
  let totalColumn = mapping.total;
  if (!priceColumn && !totalColumn) {
    totalColumn = pickMoneyColumn(headers, raw, new Set([nameColumn, mapping.quantity]));
  }

  const columns = {
    name: nameColumn,
    quantity: mapping.quantity,
    price: priceColumn,
    total: totalColumn,
    payment_method: mapping.payment_method,
    notes: mapping.notes,
    kind: mapping.kind,
    contents: mapping.contents,
    date: mapping.date,
  };

  const rows = raw.map((row, index) => buildRow(row, index, columns, 'row'));
  return { rows, sheetName, headers };
}

export function setRowKind(row, kind) {
  if (kind === 'bundle') {
    return { ...row, kind, kindReason: 'Set by you', quantity: 1, price: row.total ?? row.price };
  }
  const quantity = row.parsed_quantity || 1;
  const total = row.total ?? (row.price !== null && row.price !== undefined ? round2(row.price * quantity) : null);
  return {
    ...row,
    kind,
    kindReason: 'Set by you',
    quantity,
    total,
    price: total !== null ? round2(total / quantity) : row.price,
  };
}

export function toTransactionRecord(row, sale) {
  const notes = row.kind === 'bundle'
    ? `Bundle: ${row.contents || row.name}${row.notes ? ` (${row.notes})` : ''}`
    : row.notes || undefined;

  return {
    sale_id: sale?.id,
    operator_id: sale?.operator_id,
    sale_team_ids: sale?.sale_team || [],
    item_name: row.name,
    quantity: row.quantity,
    price: row.price,
    total: row.total,
    payment_method: row.payment_method || 'cash',
    notes,
    ...(row.date ? { transaction_date: row.date } : {}),
  };
}