import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import {
  DocumentExtractorService,
  normalizeForFingerprint,
  textFingerprint,
} from './document-extractor.service.js';

/**
 * Runs real text-layer parsing and Tesseract OCR against small fixtures.
 * The first run downloads English language data into OCR_LANG_CACHE_DIR;
 * set SKIP_OCR_TESTS=true to skip the OCR cases on an offline machine.
 */
const FIXTURES = path.resolve(process.cwd(), 'test/fixtures/ocr');
const fixture = (name: string) => path.join(FIXTURES, name);
const skipOcr = process.env.SKIP_OCR_TESTS === 'true';
const ocrIt = skipOcr ? it.skip : it;
const OCR_TIMEOUT = 180_000;

function makeService(env: Record<string, string> = {}) {
  return new DocumentExtractorService(new ConfigService(env));
}

describe('fingerprint helpers', () => {
  it('normalises case, punctuation and whitespace', () => {
    expect(normalizeForFingerprint('  Hello,\n WORLD!! 2026 ')).toBe('hello world 2026');
  });

  it('does not fingerprint short, generic text', () => {
    expect(textFingerprint('Certificate of completion')).toBeNull();
  });

  it('gives identical fingerprints to text that differs only in formatting', () => {
    const a = 'This certifies that Asha Verma has completed Advanced React and TypeScript, issued by Coursera.';
    const b = 'THIS CERTIFIES THAT ASHA VERMA\nhas completed advanced react and typescript issued by coursera';
    expect(textFingerprint(a)).not.toBeNull();
    expect(textFingerprint(a)).toBe(textFingerprint(b));
  });
});

describe('DocumentExtractorService', () => {
  let service: DocumentExtractorService;

  beforeAll(() => {
    service = makeService();
  });

  afterAll(async () => {
    await service.onModuleDestroy();
  });

  it('reads the PDF text layer without OCR', async () => {
    const result = await service.extractText(fixture('text.pdf'), 'application/pdf');
    expect(result.method).toBe('PDF_TEXT');
    expect(result.status).toBe('COMPLETED');
    expect(result.ocrConfidence).toBeNull();
    expect(result.pageCount).toBe(1);
    expect(result.text).toContain('AWS Certified Cloud Practitioner');
    expect(result.fileSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.textFingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  ocrIt(
    'renders and OCRs a scanned (image-only) PDF',
    async () => {
      const result = await service.extractText(fixture('scanned.pdf'), 'application/pdf');
      expect(result.method).toBe('OCR');
      expect(result.status).toBe('COMPLETED');
      expect(result.pages).toEqual([expect.objectContaining({ page: 1, source: 'OCR' })]);
      expect(result.ocrConfidence).toBeGreaterThan(80);
      expect(result.text).toMatch(/Advanced React and TypeScript/i);
      expect(result.text).toMatch(/Coursera/i);
    },
    OCR_TIMEOUT,
  );

  ocrIt(
    'combines the text layer and OCR for a mixed PDF',
    async () => {
      const result = await service.extractText(fixture('mixed.pdf'), 'application/pdf');
      expect(result.method).toBe('MIXED');
      expect(result.status).toBe('COMPLETED');
      expect(result.pages.map((p) => p.source)).toEqual(['TEXT_LAYER', 'OCR']);
      expect(result.text).toMatch(/Smart India Hackathon/);
      expect(result.text).toMatch(/Infosys/i);
      expect(result.ocrConfidence).toBeGreaterThan(80);
    },
    OCR_TIMEOUT,
  );

  ocrIt(
    'OCRs an image upload and reports confidence',
    async () => {
      const result = await service.extractText(fixture('certificate.png'), 'image/png');
      expect(result.method).toBe('OCR');
      expect(result.status).toBe('COMPLETED');
      expect(result.ocrConfidence).toBeGreaterThan(80);
      expect(result.text).toMatch(/Credential ID/i);
    },
    OCR_TIMEOUT,
  );

  ocrIt(
    'gives a re-scanned copy the same text fingerprint as the original',
    async () => {
      const scan = await service.extractText(fixture('scanned.pdf'), 'application/pdf');
      const photo = await service.extractText(fixture('certificate.png'), 'image/png');
      expect(scan.fileSha256).not.toBe(photo.fileSha256);
      expect(scan.textFingerprint).not.toBeNull();
      expect(scan.textFingerprint).toBe(photo.textFingerprint);
    },
    OCR_TIMEOUT,
  );

  ocrIt(
    'returns no text for a blank image',
    async () => {
      const result = await service.extractText(fixture('blank.png'), 'image/png');
      expect(result.method).toBe('OCR');
      expect(result.hasText).toBe(false);
      expect(result.textFingerprint).toBeNull();
    },
    OCR_TIMEOUT,
  );

  it('marks scanned pages PARTIAL when OCR is disabled', async () => {
    const disabled = makeService({ OCR_ENABLED: 'false' });
    const scanned = await disabled.extractText(fixture('scanned.pdf'), 'application/pdf');
    expect(scanned.status).toBe('PARTIAL');
    expect(scanned.method).toBe('NONE');
    expect(scanned.error).toMatch(/OCR is disabled/);

    const mixed = await disabled.extractText(fixture('mixed.pdf'), 'application/pdf');
    expect(mixed.status).toBe('PARTIAL');
    expect(mixed.method).toBe('PDF_TEXT');
    expect(mixed.text).toMatch(/Smart India Hackathon/);
  });

  it('respects the OCR page limit', async () => {
    const limited = makeService({ OCR_MAX_PAGES: '0' });
    const result = await limited.extractText(fixture('scanned.pdf'), 'application/pdf');
    expect(result.status).toBe('PARTIAL');
    expect(result.error).toMatch(/page limit/);
  });

  it('fails cleanly for corrupt, missing and unsupported files', async () => {
    const corrupt = path.join(os.tmpdir(), `pc-corrupt-${Date.now()}.pdf`);
    fs.writeFileSync(corrupt, 'this is not a pdf');
    try {
      const bad = await service.extractText(corrupt, 'application/pdf');
      expect(bad.status).toBe('FAILED');
      expect(bad.fileSha256).toMatch(/^[a-f0-9]{64}$/);
    } finally {
      fs.unlinkSync(corrupt);
    }

    const missing = await service.extractText(fixture('does-not-exist.pdf'), 'application/pdf');
    expect(missing.status).toBe('FAILED');
    expect(missing.fileSha256).toBeNull();

    const unsupported = await service.extractText(fixture('text.pdf'), 'application/zip');
    expect(unsupported.status).toBe('FAILED');
    expect(unsupported.error).toMatch(/Unsupported/);
  });
});
