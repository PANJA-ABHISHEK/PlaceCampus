import { extname } from 'path';

export const PDF_MIME = 'application/pdf';
export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export type ResumeFileKind = 'PDF' | 'DOCX';

/** Extension → MIME types browsers report for it. Both must agree before the content is checked. */
const ALLOWED: Record<string, { kind: ResumeFileKind; mimes: string[] }> = {
  '.pdf': { kind: 'PDF', mimes: [PDF_MIME] },
  '.docx': { kind: 'DOCX', mimes: [DOCX_MIME] },
};

export const DEFAULT_MAX_RESUME_BYTES = 5 * 1024 * 1024;

export class ResumeFileError extends Error {}

/** Fast check on name and declared type, used by the upload interceptor before the body is kept. */
export function checkDeclaredType(originalName: string, mimeType: string): ResumeFileKind {
  const rule = ALLOWED[extname(originalName || '').toLowerCase()];
  if (!rule || !rule.mimes.includes(mimeType)) {
    throw new ResumeFileError('Unsupported file type. Upload your resume as a PDF or DOCX file.');
  }
  return rule.kind;
}

/**
 * Checks the bytes match the declared kind, so a renamed executable or
 * archive is rejected whatever its extension says. DOCX structure is checked
 * again when the package is opened for text extraction.
 */
export function checkContent(buffer: Buffer, kind: ResumeFileKind, maxBytes: number): void {
  if (!buffer?.length) throw new ResumeFileError('The uploaded file is empty.');
  if (buffer.length > maxBytes) {
    throw new ResumeFileError(`The file is larger than ${Math.round(maxBytes / (1024 * 1024))} MB.`);
  }
  if (kind === 'PDF') {
    // The PDF header must appear within the first 1 KB (ISO 32000-1 §7.5.2).
    if (!buffer.subarray(0, 1024).includes('%PDF-')) {
      throw new ResumeFileError('This file is not a valid PDF document.');
    }
    return;
  }
  // DOCX is a ZIP package: local file header signature PK\x03\x04.
  if (buffer.length < 4 || buffer.readUInt32LE(0) !== 0x04034b50) {
    throw new ResumeFileError('This file is not a valid DOCX document. Password-protected files are not supported.');
  }
}
