import { writeZip } from '../../common/xlsx/xlsx.js';
import { extractDocxText, wordXmlToText } from './docx-text.js';
import { checkContent, checkDeclaredType, DOCX_MIME, PDF_MIME, ResumeFileError } from './resume-file.validation.js';
import { ResumeParserService } from './resume-parser.service.js';

const CONTENT_TYPES = `<?xml version="1.0"?><Types><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;

function docx(bodyXml: string, extra: { name: string; data: string }[] = []) {
  return writeZip([
    { name: '[Content_Types].xml', data: Buffer.from(CONTENT_TYPES) },
    { name: 'word/document.xml', data: Buffer.from(`<w:document><w:body>${bodyXml}</w:body></w:document>`) },
    ...extra.map((e) => ({ name: e.name, data: Buffer.from(e.data) })),
  ]);
}
const p = (text: string, list = false) =>
  `<w:p>${list ? '<w:pPr><w:numPr><w:ilvl w:val="0"/></w:numPr></w:pPr>' : ''}<w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;

describe('resume file validation', () => {
  it('accepts PDF and DOCX only when extension and MIME agree', () => {
    expect(checkDeclaredType('cv.pdf', PDF_MIME)).toBe('PDF');
    expect(checkDeclaredType('CV.DOCX', DOCX_MIME)).toBe('DOCX');
    expect(() => checkDeclaredType('cv.pdf', DOCX_MIME)).toThrow(ResumeFileError);
    expect(() => checkDeclaredType('cv.doc', 'application/msword')).toThrow(ResumeFileError);
    expect(() => checkDeclaredType('cv.exe', 'application/pdf')).toThrow(ResumeFileError);
  });

  it('rejects content that does not match the declared type', () => {
    const exe = Buffer.from('MZ\x90\x00 this is not a pdf');
    expect(() => checkContent(exe, 'PDF', 1024)).toThrow('not a valid PDF');
    expect(() => checkContent(exe, 'DOCX', 1024)).toThrow('not a valid DOCX');
    expect(() => checkContent(Buffer.alloc(0), 'PDF', 1024)).toThrow('empty');
    expect(() => checkContent(Buffer.from('%PDF-1.7' + 'x'.repeat(2000)), 'PDF', 1024)).toThrow('larger than');
    expect(() => checkContent(Buffer.from('%PDF-1.7\n'), 'PDF', 1024)).not.toThrow();
  });
});

describe('DOCX text extraction', () => {
  it('keeps paragraphs, bullets, entities and header contact details', () => {
    const buffer = docx(
      p('Education') + p('B.Tech CSE &amp; AI, 2026') + p('Built a REST API in Node.js', true),
      [{ name: 'word/header1.xml', data: `<w:hdr>${p('Asha Rao | asha@example.com')}</w:hdr>` }],
    );
    const { text } = extractDocxText(buffer);
    expect(text).toBe('Education\nB.Tech CSE & AI, 2026\n• Built a REST API in Node.js\nAsha Rao | asha@example.com');
  });

  it('reads paragraphs nested in text boxes once', () => {
    const xml = `<w:p><w:r><w:t>Before</w:t></w:r><mc:AlternateContent><mc:Choice><w:txbxContent>${p('Inside box')}</w:txbxContent></mc:Choice><mc:Fallback><w:txbxContent>${p('Inside box')}</w:txbxContent></mc:Fallback></mc:AlternateContent></w:p>`;
    expect(wordXmlToText(xml).split('\n').sort()).toEqual(['Before', 'Inside box']);
  });

  it('rejects non-Word packages and macro-enabled documents', () => {
    const notWord = writeZip([{ name: '[Content_Types].xml', data: Buffer.from('<Types/>') }]);
    expect(() => extractDocxText(notWord)).toThrow('not a Word');
    const macro = docx(p('Hi'), [{ name: 'word/vbaProject.bin', data: 'x' }]);
    expect(() => extractDocxText(macro)).toThrow('Macro-enabled');
    expect(() => extractDocxText(Buffer.from('PK\x03\x04garbage'))).toThrow(ResumeFileError);
  });
});

describe('ResumeParserService', () => {
  const parser = new ResumeParserService({ extractText: vi.fn() } as any);

  it('parses a DOCX resume and counts words', async () => {
    const lines = Array.from({ length: 12 }, (_, i) => p(`Developed feature number ${i} for the placement portal using React`, true));
    const parsed = await parser.parse(docx(p('Projects') + lines.join('')), 'DOCX');
    expect(parsed.method).toBe('DOCX');
    expect(parsed.wordCount).toBeGreaterThan(90);
    expect(parsed.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('refuses documents with too little text', async () => {
    await expect(parser.parse(docx(p('Just a name')), 'DOCX')).rejects.toThrow('too little text');
  });

  it('maps a failed PDF extraction to a clear message and removes the temp file', async () => {
    const extractText = vi.fn(async () => ({ status: 'FAILED', method: 'NONE', text: '' }));
    const pdfParser = new ResumeParserService({ extractText } as any);
    await expect(pdfParser.parse(Buffer.from('%PDF-1.4 broken'), 'PDF')).rejects.toThrow('could not be read');
    const tempPath = (extractText.mock.calls[0] as unknown as [string])[0];
    const fs = await import('fs');
    expect(fs.existsSync(tempPath)).toBe(false);
  });
});
