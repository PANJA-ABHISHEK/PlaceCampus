import { inflateRawSync, deflateRawSync } from 'zlib';

/**
 * Minimal, dependency-free XLSX reader/writer for bulk imports.
 *
 * Reading covers what institution workbooks use: shared and inline strings,
 * numbers and booleans (cached formula results are read as values, never
 * evaluated). Safety limits guard against zip bombs and oversized files, and
 * macro-enabled or encrypted workbooks are rejected (Master Plan §8.9 step 3).
 */

export type CellValue = string | number | boolean | null;
export interface Sheet {
  name: string;
  rows: CellValue[][];
}

export class XlsxError extends Error {
  constructor(
    public readonly code:
      | 'NOT_XLSX'
      | 'MACRO_ENABLED'
      | 'TOO_LARGE'
      | 'CORRUPT'
      | 'NO_SHEETS',
    message: string,
  ) {
    super(message);
  }
}

const LIMITS = {
  maxEntries: 2_000,
  maxEntryBytes: 60 * 1024 * 1024,
  maxTotalBytes: 120 * 1024 * 1024,
  maxRatio: 200, // uncompressed / compressed
};

/* ------------------------------------------------------------------ */
/* ZIP                                                                 */
/* ------------------------------------------------------------------ */

function readZip(buf: Buffer): Map<string, Buffer> {
  if (buf.length < 22 || buf.readUInt32LE(0) !== 0x04034b50) {
    // Encrypted workbooks are OLE containers, not ZIP.
    throw new XlsxError('NOT_XLSX', 'The file is not an .xlsx workbook (or it is password-protected).');
  }
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new XlsxError('CORRUPT', 'The workbook is damaged (no central directory).');
  const count = buf.readUInt16LE(eocd + 10);
  let offset = buf.readUInt32LE(eocd + 16);
  if (count > LIMITS.maxEntries) throw new XlsxError('TOO_LARGE', 'The workbook has too many parts.');

  const files = new Map<string, Buffer>();
  let total = 0;
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(offset) !== 0x02014b50) throw new XlsxError('CORRUPT', 'The workbook is damaged.');
    const method = buf.readUInt16LE(offset + 10);
    const compressed = buf.readUInt32LE(offset + 20);
    const size = buf.readUInt32LE(offset + 24);
    const nameLen = buf.readUInt16LE(offset + 28);
    const extraLen = buf.readUInt16LE(offset + 30);
    const commentLen = buf.readUInt16LE(offset + 32);
    const local = buf.readUInt32LE(offset + 42);
    const name = buf.toString('utf8', offset + 46, offset + 46 + nameLen);
    offset += 46 + nameLen + extraLen + commentLen;

    if (size > LIMITS.maxEntryBytes || (compressed > 0 && size / compressed > LIMITS.maxRatio)) {
      throw new XlsxError('TOO_LARGE', 'The workbook expands to an unsafe size.');
    }
    total += size;
    if (total > LIMITS.maxTotalBytes) throw new XlsxError('TOO_LARGE', 'The workbook expands to an unsafe size.');
    if (name.endsWith('/')) continue;

    const dataStart = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(dataStart, dataStart + compressed);
    let data: Buffer;
    if (method === 0) data = Buffer.from(raw);
    else if (method === 8) data = inflateRawSync(raw, { maxOutputLength: LIMITS.maxEntryBytes });
    else throw new XlsxError('CORRUPT', `Unsupported compression in "${name}".`);
    files.set(name.replace(/^\//, ''), data);
  }
  return files;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function writeZip(entries: { name: string; data: Buffer }[]): Buffer {
  const locals: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, 'utf8');
    const deflated = deflateRawSync(data);
    const crc = crc32(data);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x0800, 6); // UTF-8 names
    header.writeUInt16LE(8, 8);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(deflated.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(nameBuf.length, 26);
    locals.push(header, nameBuf, deflated);

    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0x0800, 8);
    dir.writeUInt16LE(8, 10);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(deflated.length, 20);
    dir.writeUInt32LE(data.length, 24);
    dir.writeUInt16LE(nameBuf.length, 28);
    dir.writeUInt32LE(offset, 42);
    central.push(dir, nameBuf);
    offset += header.length + nameBuf.length + deflated.length;
  }
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, end]);
}

/* ------------------------------------------------------------------ */
/* XLSX                                                                */
/* ------------------------------------------------------------------ */

const decode = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&amp;/g, '&');
const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const texts = (xml: string) =>
  [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decode(m[1])).join('');
const attr = (tag: string, name: string) =>
  new RegExp(`[\\s<]${name.replace(':', '\\:')}="([^"]*)"`).exec(tag)?.[1];
const colIndex = (ref: string) =>
  ref.replace(/\d+/g, '').split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

export function readWorkbook(buf: Buffer): Sheet[] {
  return readWorkbookWithProperties(buf).sheets;
}

/** Sheets plus custom document properties (e.g. pcTemplate, pcTemplateVersion). */
export function readWorkbookWithProperties(buf: Buffer): { sheets: Sheet[]; properties: Record<string, string> } {
  const files = readZip(buf);
  const names = [...files.keys()];
  if (names.some((n) => /vbaProject\.bin$/i.test(n))) {
    throw new XlsxError('MACRO_ENABLED', 'Macro-enabled workbooks are not accepted.');
  }
  const text = (name: string) => files.get(name)?.toString('utf8') ?? '';
  const workbook = text('xl/workbook.xml');
  if (!workbook) throw new XlsxError('NOT_XLSX', 'The file is not an .xlsx workbook.');

  const shared = [...text('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => texts(m[1]));
  const rels = new Map(
    [...text('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\s[^>]*>/g)].map((m) => [
      attr(m[0], 'Id') ?? '',
      (attr(m[0], 'Target') ?? '').replace(/^\/?xl\//, ''),
    ]),
  );

  const sheets: Sheet[] = [];
  for (const m of workbook.matchAll(/<sheet\s[^>]*>/g)) {
    const target = rels.get(attr(m[0], 'r:id') ?? '');
    const xml = target ? text(`xl/${target}`) : '';
    const rows: CellValue[][] = [];
    for (const r of xml.matchAll(/<row(\s[^>]*)?>([\s\S]*?)<\/row>/g)) {
      const rowNumber = Number(attr(`<row${r[1] ?? ''}>`, 'r')) || rows.length + 1;
      const row: CellValue[] = [];
      for (const c of r[2].matchAll(/<c(\s[^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const tag = `<c${c[1]}>`;
        const body = c[2] ?? '';
        const ref = attr(tag, 'r');
        const type = attr(tag, 't');
        const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
        let value: CellValue = null;
        if (type === 's') value = v != null ? (shared[Number(v)] ?? null) : null;
        else if (type === 'inlineStr') value = texts(body);
        else if (type === 'str') value = v != null ? decode(v) : null;
        else if (type === 'b') value = v === '1';
        else if (type === 'e') value = null;
        else if (v != null) value = Number(v);
        row[ref ? colIndex(ref) : row.length] = value;
      }
      rows[rowNumber - 1] = Array.from(row, (x) => (x === undefined ? null : x));
    }
    sheets.push({ name: decode(attr(m[0], 'name') ?? ''), rows: Array.from(rows, (x) => x ?? []) });
  }
  if (!sheets.length) throw new XlsxError('NO_SHEETS', 'The workbook has no sheets.');
  const properties: Record<string, string> = {};
  for (const m of text('docProps/custom.xml').matchAll(/<property\s[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/property>/g)) {
    properties[decode(m[1])] = decode(m[2].replace(/<[^>]+>/g, ''));
  }
  return { sheets, properties };
}

const colName = (i: number) => {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

/** Writes a plain workbook (inline strings, numbers) — used for templates and reports. */
export function writeWorkbook(sheets: Sheet[], properties: Record<string, string> = {}): Buffer {
  const sheetXml = (rows: CellValue[][]) =>
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows
      .map(
        (row, r) =>
          `<row r="${r + 1}">${row
            .map((v, c) => {
              const ref = `${colName(c)}${r + 1}`;
              if (v === null || v === undefined || v === '') return '';
              if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}"><v>${v}</v></c>`;
              if (typeof v === 'boolean') return `<c r="${ref}" t="b"><v>${v ? 1 : 0}</v></c>`;
              return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escape(String(v))}</t></is></c>`;
            })
            .join('')}</row>`,
      )
      .join('')}</sheetData></worksheet>`;
  const custom = Object.entries(properties)
    .map(
      ([k, v], i) =>
        `<property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="${i + 2}" name="${escape(k)}"><vt:lpwstr>${escape(v)}</vt:lpwstr></property>`,
    )
    .join('');
  const files = [
    {
      name: '[Content_Types].xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets
        .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
        .join('')}${custom ? '<Override PartName="/docProps/custom.xml" ContentType="application/vnd.openxmlformats-officedocument.custom-properties+xml"/>' : ''}</Types>`,
    },
    {
      name: '_rels/.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>${custom ? '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/custom-properties" Target="docProps/custom.xml"/>' : ''}</Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets
        .map((s, i) => `<sheet name="${escape(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
        .join('')}</sheets></workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets
        .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
        .join('')}</Relationships>`,
    },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s.rows) })),
    ...(custom
      ? [
          {
            name: 'docProps/custom.xml',
            data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">${custom}</Properties>`,
          },
        ]
      : []),
  ];
  return writeZip(files.map((f) => ({ name: f.name, data: Buffer.from(f.data, 'utf8') })));
}

/** Prefix cells that a spreadsheet would treat as formulas (report export). */
export function safeCell(value: CellValue): CellValue {
  return typeof value === 'string' && /^[=+\-@]/.test(value) ? `'${value}` : value;
}
