import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import { tmpdir } from 'os';
import * as path from 'path';
import { DocumentExtractorService } from '../../verification/providers/document-extractor.service.js';
import { extractDocxText } from './docx-text.js';
import { PDF_MIME, ResumeFileError, type ResumeFileKind } from './resume-file.validation.js';

export type ResumeExtractionMethod = 'PDF_TEXT' | 'OCR' | 'MIXED' | 'DOCX';

export interface ParsedResume {
  text: string;
  method: ResumeExtractionMethod;
  pageCount: number | null;
  wordCount: number;
  /** Mean OCR confidence (0-100) when any page had to be OCR'd. */
  ocrConfidence: number | null;
  sha256: string;
}

/** Fewer readable characters than this cannot be a resume worth analysing. */
export const MIN_RESUME_CHARS = 200;

export function countResumeWords(text: string): number {
  return text.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
}

/** Normalises line endings and spacing without changing any words. */
export function tidyResumeText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    // oxlint-disable-next-line no-control-regex -- strips control bytes left by extraction
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/[ \t ]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Turns an uploaded PDF or DOCX into plain text. PDFs reuse the evidence
 * pipeline's extractor (text layer first, local OCR for scanned pages); DOCX
 * is read directly from its WordprocessingML parts.
 */
@Injectable()
export class ResumeParserService {
  private readonly logger = new Logger(ResumeParserService.name);

  constructor(private readonly extractor: DocumentExtractorService) {}

  async parse(buffer: Buffer, kind: ResumeFileKind): Promise<ParsedResume> {
    const sha256 = createHash('sha256').update(buffer).digest('hex');
    const parsed = kind === 'PDF' ? await this.parsePdf(buffer) : this.parseDocx(buffer);
    const text = tidyResumeText(parsed.text);
    if (text.replace(/\s/g, '').length < MIN_RESUME_CHARS) {
      throw new ResumeFileError(
        kind === 'PDF'
          ? 'We could not read enough text from this PDF. If it is a scanned image, export the resume from your editor as a text-based PDF or DOCX.'
          : 'This DOCX file contains too little text to analyse. Check that it is your complete resume.',
      );
    }
    return { ...parsed, text, wordCount: countResumeWords(text), sha256 };
  }

  private async parsePdf(buffer: Buffer) {
    // The extractor reads from a path; keep the copy private and short-lived.
    const dir = path.join(tmpdir(), 'placecampus-resumes');
    const file = path.join(dir, `${randomUUID()}.pdf`);
    try {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(file, buffer, { flag: 'wx', mode: 0o600 });
      const result = await this.extractor.extractText(file, PDF_MIME);
      if (result.status === 'FAILED' || result.method === 'NONE') {
        this.logger.warn(`Resume PDF extraction ${result.status} (${result.method})`);
        throw new ResumeFileError(
          'This PDF could not be read. It may be damaged, password-protected or an image without text.',
        );
      }
      return {
        text: result.text,
        method: result.method as ResumeExtractionMethod,
        pageCount: result.pageCount || null,
        ocrConfidence: result.ocrConfidence,
      };
    } finally {
      await fs.unlink(file).catch(() => undefined);
    }
  }

  private parseDocx(buffer: Buffer) {
    const { text, pageCount } = extractDocxText(buffer);
    return { text, method: 'DOCX' as const, pageCount, ocrConfidence: null };
  }
}
