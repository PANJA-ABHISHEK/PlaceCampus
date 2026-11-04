import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import { createReadStream } from 'fs';
import * as path from 'path';
import { PDFParse } from 'pdf-parse';
import Tesseract from 'tesseract.js';

export interface ExtractionResult {
  text: string;
  method: 'PDF_TEXT' | 'IMAGE_OCR' | 'NONE';
  hasText: boolean;
  wordCount: number;
}

@Injectable()
export class DocumentExtractorService {
  private readonly logger = new Logger(DocumentExtractorService.name);

  async extractText(
    absolutePath: string,
    mimeType: string,
  ): Promise<ExtractionResult> {
    this.logger.debug(`Extracting text from ${absolutePath} (${mimeType})`);

    try {
      if (mimeType === 'application/pdf') {
        return await this.extractFromPdf(absolutePath);
      } else if (mimeType.startsWith('image/')) {
        return await this.extractFromImage(absolutePath);
      } else {
        return { text: '', method: 'NONE', hasText: false, wordCount: 0 };
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to extract text: ${error.message}`,
        error.stack,
      );
      return { text: '', method: 'NONE', hasText: false, wordCount: 0 };
    }
  }

  private async extractFromPdf(filePath: string): Promise<ExtractionResult> {
    const dataBuffer = fs.readFileSync(filePath);
    // pdf-parse v2 exposes a class instead of the v1 default function.
    const parser = new PDFParse({ data: dataBuffer });
    let text: string;
    try {
      text = (await parser.getText()).text.trim();
    } finally {
      await parser.destroy();
    }

    return {
      text,
      method: 'PDF_TEXT',
      hasText: text.length > 0,
      wordCount: text.split(/\s+/).filter(Boolean).length,
    };
  }

  private async extractFromImage(filePath: string): Promise<ExtractionResult> {
    const {
      data: { text },
    } = await Tesseract.recognize(filePath, 'eng');

    const trimmed = text.trim();
    return {
      text: trimmed,
      method: 'IMAGE_OCR',
      hasText: trimmed.length > 0,
      wordCount: trimmed.split(/\s+/).filter(Boolean).length,
    };
  }
}
