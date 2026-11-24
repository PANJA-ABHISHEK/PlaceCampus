import { readZip, XlsxError } from '../../common/xlsx/xlsx.js';
import { ResumeFileError } from './resume-file.validation.js';

const XML_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decodeXml(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    }
    return XML_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/**
 * Plain text of one WordprocessingML part. Paragraphs become lines, list
 * paragraphs are prefixed with a bullet (resume structure depends on them),
 * and tabs and breaks are kept. Each table-cell paragraph becomes its own line.
 */
export function wordXmlToText(xml: string): string {
  // Text boxes are stored twice (DrawingML choice + VML fallback); keep one copy.
  const source = xml.replace(/<mc:Fallback>[\s\S]*?<\/mc:Fallback>/g, '');
  const lines: string[] = [];
  // A linear scan copes with paragraphs nested inside text boxes, which a
  // whole-paragraph regex would split incorrectly.
  const stack: { text: string; listItem: boolean }[] = [];
  const pattern =
    /<w:p(?=[\s>/])[^>]*?(\/?)>|<\/w:p>|<w:numPr[\s>]|<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br(?:\s[^>]*)?\/>|<w:cr\/>/g;
  const flush = (paragraph: { text: string; listItem: boolean }) => {
    const line = paragraph.text.replace(/[  ]+/g, ' ').replace(/ *\n */g, '\n').trim();
    if (line) lines.push(paragraph.listItem ? `• ${line}` : line);
  };
  for (const match of source.matchAll(pattern)) {
    const token = match[0];
    const current = stack[stack.length - 1];
    if (token.startsWith('<w:p')) {
      if (match[1] !== '/') stack.push({ text: '', listItem: false });
    } else if (token === '</w:p>') {
      const done = stack.pop();
      if (done) flush(done);
    } else if (!current) {
      continue;
    } else if (token.startsWith('<w:numPr')) {
      current.listItem = true;
    } else if (token.startsWith('<w:tab')) {
      current.text += '\t';
    } else if (token.startsWith('<w:br') || token.startsWith('<w:cr')) {
      current.text += '\n';
    } else {
      current.text += decodeXml(match[2] ?? '');
    }
  }
  while (stack.length) flush(stack.pop()!);
  return lines.join('\n');
}

export interface DocxText {
  text: string;
  /** Estimated from the document's own page count when Word saved one. */
  pageCount: number | null;
}

/**
 * Reads a .docx resume. The main document comes first, then headers and
 * footers, which is where many templates keep the name and contact details.
 * Macro-carrying packages are rejected.
 */
export function extractDocxText(buffer: Buffer): DocxText {
  let parts: Map<string, Buffer>;
  try {
    parts = readZip(buffer);
  } catch (error) {
    if (error instanceof XlsxError && error.code === 'TOO_LARGE') {
      throw new ResumeFileError('The DOCX file expands to an unsafe size and was rejected.');
    }
    throw new ResumeFileError('This DOCX file is damaged or password-protected and could not be read.');
  }

  const contentTypes = parts.get('[Content_Types].xml')?.toString('utf8') ?? '';
  if (!contentTypes.includes('wordprocessingml.document.main+xml') || !parts.has('word/document.xml')) {
    throw new ResumeFileError('This file is not a Word (.docx) document.');
  }
  if ([...parts.keys()].some((name) => /vbaProject\.bin$/i.test(name))) {
    throw new ResumeFileError('Macro-enabled Word documents are not accepted. Save the resume as a plain .docx or PDF.');
  }

  const sections = [wordXmlToText(parts.get('word/document.xml')!.toString('utf8'))];
  const extras = [...parts.keys()].filter((name) => /^word\/(header|footer)\d*\.xml$/i.test(name)).sort();
  for (const name of extras) {
    const text = wordXmlToText(parts.get(name)!.toString('utf8'));
    if (text && !sections.some((existing) => existing.includes(text))) sections.push(text);
  }

  const appXml = parts.get('docProps/app.xml')?.toString('utf8') ?? '';
  const pages = Number(appXml.match(/<Pages>(\d+)<\/Pages>/)?.[1]);
  return {
    text: sections.filter(Boolean).join('\n'),
    pageCount: Number.isFinite(pages) && pages > 0 ? pages : null,
  };
}
