import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';
import { PDFParse } from 'pdf-parse';
import Tesseract from 'tesseract.js';

/**
 * Master Plan §12 step 2: "Extract text: PDF text layer, else render + OCR".
 *
 * - PDFs: the text layer is read page by page. A page whose text layer is
 *   (nearly) empty is a scanned page: it is rendered to an image and OCR'd.
 * - Images (JPEG/PNG): OCR'd directly.
 * - If OCR cannot run (disabled, language data unavailable, page limit hit,
 *   render error) the extraction is PARTIAL and the pipeline continues; the
 *   reviewer still sees the document.
 */
export type ExtractionMethod = 'PDF_TEXT' | 'OCR' | 'MIXED' | 'NONE';
export type ExtractionStatus = 'COMPLETED' | 'PARTIAL' | 'FAILED';

export interface PageExtraction {
  page: number;
  source: 'TEXT_LAYER' | 'OCR' | 'NONE';
  chars: number;
  /** Tesseract mean confidence for the page, 0-100. */
  ocrConfidence?: number;
  error?: string;
}

export interface ExtractionResult {
  text: string;
  method: ExtractionMethod;
  status: ExtractionStatus;
  hasText: boolean;
  wordCount: number;
  charCount: number;
  /** Character-weighted OCR confidence over OCR'd pages (0-100); null when OCR did not run. */
  ocrConfidence: number | null;
  pageCount: number;
  pages: PageExtraction[];
  /** SHA-256 of the file bytes: exact-duplicate detection. */
  fileSha256: string | null;
  /** SHA-256 of the normalised text (null when too little text): re-saved/re-scanned duplicates. */
  textFingerprint: string | null;
  engineVersions: { pdfParse?: string; tesseract?: string };
  durationMs: number;
  error?: string;
}

/** Pages with fewer non-whitespace characters than this in their text layer are OCR'd. */
export const SCANNED_PAGE_THRESHOLD = 20;
/** Text shorter than this (normalised) is too generic to fingerprint. */
export const MIN_FINGERPRINT_CHARS = 80;

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function normalizeForFingerprint(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function textFingerprint(text: string): string | null {
  const normalized = normalizeForFingerprint(text);
  if (normalized.replace(/\s/g, '').length < MIN_FINGERPRINT_CHARS) return null;
  return createHash('sha256').update(normalized).digest('hex');
}

const requireFromHere = createRequire(import.meta.url);

/** Reads a dependency's version from its package.json (exports maps hide it from require). */
function packageVersion(name: string): string | undefined {
  try {
    let dir = path.dirname(requireFromHere.resolve(name));
    for (let i = 0; i < 6; i += 1) {
      const file = path.join(dir, 'package.json');
      if (fs.existsSync(file)) {
        const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (pkg.name === name) return pkg.version;
      }
      dir = path.dirname(dir);
    }
  } catch {
    /* version is informational only */
  }
  return undefined;
}

class OcrTimeoutError extends Error {}

@Injectable()
export class DocumentExtractorService implements OnModuleDestroy {
  private readonly logger = new Logger(DocumentExtractorService.name);
  private readonly ocrEnabled: boolean;
  private readonly maxOcrPages: number;
  private readonly pageTimeoutMs: number;
  private readonly langCachePath: string;
  private readonly langPath?: string;
  private readonly engineVersions = {
    pdfParse: packageVersion('pdf-parse'),
    tesseract: packageVersion('tesseract.js'),
  };

  private worker: Promise<Tesseract.Worker> | null = null;
  /** Serialises OCR calls: one Tesseract worker handles one image at a time. */
  private ocrChain: Promise<unknown> = Promise.resolve();

  constructor(config: ConfigService) {
    this.ocrEnabled = config.get<string>('OCR_ENABLED', 'true') !== 'false';
    const num = (key: string, fallback: number) => {
      const value = Number(config.get<string>(key));
      return config.get(key) !== undefined && Number.isFinite(value) && value >= 0 ? value : fallback;
    };
    this.maxOcrPages = num('OCR_MAX_PAGES', 10);
    this.pageTimeoutMs = num('OCR_PAGE_TIMEOUT_MS', 60_000) || 60_000;
    this.langCachePath = path.resolve(
      config.get<string>('OCR_LANG_CACHE_DIR') || path.join(process.cwd(), '.cache', 'tessdata'),
    );
    // Optional directory/URL holding eng.traineddata(.gz) for offline installs.
    this.langPath = config.get<string>('OCR_LANG_PATH') || undefined;
  }

  async onModuleDestroy() {
    await this.resetWorker();
  }

  async extractText(absolutePath: string, mimeType: string): Promise<ExtractionResult> {
    const startedAt = Date.now();
    this.logger.debug(`Extracting text from ${absolutePath} (${mimeType})`);

    let buffer: Buffer;
    try {
      buffer = await fs.promises.readFile(absolutePath);
    } catch (error: any) {
      this.logger.error(`Cannot read document: ${error.message}`);
      return this.finish(startedAt, null, [], { status: 'FAILED', error: 'Document file could not be read.' });
    }
    const fileSha256 = createHash('sha256').update(buffer).digest('hex');

    try {
      if (mimeType === 'application/pdf') return await this.extractFromPdf(buffer, fileSha256, startedAt);
      if (mimeType.startsWith('image/')) return await this.extractFromImage(buffer, fileSha256, startedAt);
      return this.finish(startedAt, fileSha256, [], {
        status: 'FAILED',
        error: `Unsupported file type for extraction: ${mimeType}`,
      });
    } catch (error: any) {
      this.logger.error(`Failed to extract text: ${error.message}`, error.stack);
      return this.finish(startedAt, fileSha256, [], {
        status: 'FAILED',
        error: `Document could not be parsed: ${error.message}`,
      });
    }
  }

  private async extractFromPdf(buffer: Buffer, fileSha256: string, startedAt: number) {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const pages: (PageExtraction & { text: string })[] = [];
    const notes: string[] = [];
    try {
      const textResult = await parser.getText();
      let ocrPagesUsed = 0;
      for (const page of textResult.pages) {
        const layerText = page.text.trim();
        if (layerText.replace(/\s/g, '').length >= SCANNED_PAGE_THRESHOLD) {
          pages.push({ page: page.num, source: 'TEXT_LAYER', chars: layerText.length, text: layerText });
          continue;
        }
        // Scanned page: render and OCR, within the configured limits.
        if (!this.ocrEnabled) {
          pages.push(this.skippedPage(page.num, layerText, 'OCR is disabled.'));
          continue;
        }
        if (ocrPagesUsed >= this.maxOcrPages) {
          pages.push(this.skippedPage(page.num, layerText, `OCR page limit (${this.maxOcrPages}) reached.`));
          continue;
        }
        ocrPagesUsed += 1;
        try {
          const shot = await parser.getScreenshot({
            partial: [page.num],
            scale: 2,
            imageBuffer: true,
            imageDataUrl: false,
          });
          const image = shot.pages[0];
          if (!image?.data?.length) throw new Error('Page could not be rendered.');
          const ocr = await this.recognize(Buffer.from(image.data));
          pages.push({
            page: page.num,
            source: 'OCR',
            chars: ocr.text.length,
            ocrConfidence: ocr.confidence,
            text: ocr.text,
          });
        } catch (error: any) {
          this.logger.warn(`OCR failed for PDF page ${page.num}: ${error.message}`);
          pages.push(this.skippedPage(page.num, layerText, this.ocrErrorMessage(error)));
        }
      }
      if (textResult.pages.length === 0) notes.push('The PDF has no pages.');
    } finally {
      await parser.destroy().catch(() => undefined);
    }
    return this.finish(startedAt, fileSha256, pages, { error: notes.join(' ') || undefined });
  }

  private async extractFromImage(buffer: Buffer, fileSha256: string, startedAt: number) {
    if (!this.ocrEnabled) {
      return this.finish(startedAt, fileSha256, [this.skippedPage(1, '', 'OCR is disabled.')], {});
    }
    try {
      const ocr = await this.recognize(buffer);
      return this.finish(
        startedAt,
        fileSha256,
        [{ page: 1, source: 'OCR', chars: ocr.text.length, ocrConfidence: ocr.confidence, text: ocr.text }],
        {},
      );
    } catch (error: any) {
      this.logger.warn(`OCR failed for image: ${error.message}`);
      return this.finish(startedAt, fileSha256, [this.skippedPage(1, '', this.ocrErrorMessage(error))], {});
    }
  }

  private skippedPage(page: number, layerText: string, error: string): PageExtraction & { text: string } {
    return {
      page,
      source: layerText ? 'TEXT_LAYER' : 'NONE',
      chars: layerText.length,
      text: layerText,
      error,
    };
  }

  private ocrErrorMessage(error: Error) {
    if (error instanceof OcrTimeoutError) return 'OCR timed out for this page.';
    return `OCR unavailable: ${error.message}`;
  }

  /** Assembles the final result from per-page outcomes. */
  private finish(
    startedAt: number,
    fileSha256: string | null,
    pages: (PageExtraction & { text: string })[],
    opts: { status?: ExtractionStatus; error?: string },
  ): ExtractionResult {
    const text = pages
      .map((p) => p.text)
      .filter(Boolean)
      .join('\n\n')
      .trim();
    const usedTextLayer = pages.some((p) => p.source === 'TEXT_LAYER' && p.chars > 0);
    const ocrPages = pages.filter((p) => p.source === 'OCR');
    const method: ExtractionMethod =
      usedTextLayer && ocrPages.length ? 'MIXED' : ocrPages.length ? 'OCR' : usedTextLayer ? 'PDF_TEXT' : 'NONE';

    let ocrConfidence: number | null = null;
    if (ocrPages.length) {
      const totalChars = ocrPages.reduce((sum, p) => sum + p.chars, 0);
      ocrConfidence =
        totalChars > 0
          ? ocrPages.reduce((sum, p) => sum + (p.ocrConfidence ?? 0) * p.chars, 0) / totalChars
          : ocrPages.reduce((sum, p) => sum + (p.ocrConfidence ?? 0), 0) / ocrPages.length;
      ocrConfidence = Math.round(ocrConfidence * 10) / 10;
    }

    const pageErrors = pages.filter((p) => p.error);
    const status: ExtractionStatus = opts.status ?? (pageErrors.length ? 'PARTIAL' : 'COMPLETED');
    const errors = [opts.error, ...pageErrors.map((p) => `Page ${p.page}: ${p.error}`)].filter(Boolean);

    return {
      text,
      method,
      status,
      hasText: text.length > 0,
      wordCount: countWords(text),
      charCount: text.length,
      ocrConfidence,
      pageCount: pages.length,
      pages: pages.map(({ text: _text, ...page }) => page),
      fileSha256,
      textFingerprint: textFingerprint(text),
      engineVersions: this.engineVersions,
      durationMs: Date.now() - startedAt,
      error: errors.length ? errors.join(' ') : undefined,
    };
  }

  /** OCRs one image. Calls are serialised onto a single reusable worker. */
  private recognize(image: Buffer): Promise<{ text: string; confidence: number }> {
    const run = this.ocrChain.then(async () => {
      const worker = await this.getWorker();
      let timer: NodeJS.Timeout | undefined;
      try {
        const { data } = await Promise.race([
          worker.recognize(image),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new OcrTimeoutError('OCR timed out')), this.pageTimeoutMs);
          }),
        ]);
        return { text: data.text.trim(), confidence: Math.round(data.confidence * 10) / 10 };
      } catch (error) {
        // A timed-out or crashed worker cannot be trusted with the next page.
        await this.resetWorker();
        throw error;
      } finally {
        if (timer) clearTimeout(timer);
      }
    });
    this.ocrChain = run.catch(() => undefined);
    return run;
  }

  private getWorker(): Promise<Tesseract.Worker> {
    if (!this.worker) {
      fs.mkdirSync(this.langCachePath, { recursive: true });
      this.worker = Tesseract.createWorker('eng', 1, {
        cachePath: this.langCachePath,
        ...(this.langPath ? { langPath: this.langPath } : {}),
        errorHandler: (error: unknown) => this.logger.warn(`Tesseract worker error: ${String(error)}`),
      });
      this.worker.catch(() => {
        // Language data could not be loaded (e.g. offline): retry on the next document.
        this.worker = null;
      });
    }
    return this.worker;
  }

  private async resetWorker() {
    const current = this.worker;
    this.worker = null;
    if (!current) return;
    try {
      await (await current).terminate();
    } catch {
      /* already gone */
    }
  }
}
