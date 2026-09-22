import { Injectable, Logger } from '@nestjs/common';

/**
 * Document text extraction service.
 * In production, integrate with OCR (Tesseract.js, Google Vision, AWS Textract).
 * For dev, returns a placeholder indicating OCR is needed.
 */
@Injectable()
export class DocumentExtractionService {
  private readonly logger = new Logger(DocumentExtractionService.name);

  async extractText(fileUrl: string, mimeType?: string): Promise<string> {
    this.logger.log(`Extracting text from: ${fileUrl} (${mimeType ?? 'unknown'})`);

    // TODO: Integrate actual OCR service
    // For PDFs: use pdf-parse or similar
    // For images: use Tesseract.js or cloud OCR
    //
    // For now, return a marker that triggers NEEDS_REVIEW
    // so faculty can manually review the document

    if (mimeType?.startsWith('image/')) {
      return '[OCR_NOT_CONFIGURED] Image document requires OCR extraction. Routed to faculty review.';
    }

    if (mimeType === 'application/pdf') {
      return '[OCR_NOT_CONFIGURED] PDF document requires text extraction. Routed to faculty review.';
    }

    return '[OCR_NOT_CONFIGURED] Document type requires manual review.';
  }
}
