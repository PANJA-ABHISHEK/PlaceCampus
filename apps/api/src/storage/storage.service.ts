import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';

export interface SavedFileMeta {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  key: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  // Default to a local 'uploads' directory at the root of the monorepo for development
  private readonly uploadDir = path.join(process.cwd(), '..', '..', 'uploads');

  constructor() {
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      this.logger.error('Failed to create upload directory', error);
    }
  }

  /**
   * Save a file to storage under a specific entity namespace
   * E.g. saveFile('evidence/student_id', file)
   */
  async saveFile(namespace: string, file: any): Promise<SavedFileMeta> {
    try {
      const fileId = randomUUID();
      // Generate a safe extension
      const ext = path.extname(file.originalname).toLowerCase();
      const safeKey = `${namespace}/${fileId}${ext}`;
      const absolutePath = path.join(this.uploadDir, safeKey);

      // Ensure directory exists for the namespace
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });

      // Multer's default memory storage supplies a buffer; disk storage supplies
      // a temporary path. Support both so uploads work with either interceptor.
      if (file.buffer) {
        await fs.writeFile(absolutePath, file.buffer, { flag: 'wx' });
      } else if (file.path) {
        try {
          await fs.rename(file.path, absolutePath);
        } catch (error: any) {
          // Fall back to copy+unlink when the temp and upload directories are
          // on different filesystems. Re-throw other errors unchanged.
          if (error.code !== 'EXDEV') throw error;
          await fs.copyFile(file.path, absolutePath);
          await fs.unlink(file.path);
        }
      } else {
        throw new Error('Uploaded file has neither a buffer nor a temporary path');
      }

      return {
        id: fileId,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        key: safeKey,
      };
    } catch (error: any) {
      this.logger.error(`Failed to save file: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to process uploaded file');
    }
  }

  /**
   * Retrieves a file path for download/streaming
   */
  async getFilePath(key: string): Promise<string> {
    const absolutePath = path.join(this.uploadDir, key);
    try {
      await fs.access(absolutePath);
      return absolutePath;
    } catch (error: any) {
      throw new InternalServerErrorException('File not found in storage');
    }
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(key: string): Promise<void> {
    const absolutePath = path.join(this.uploadDir, key);
    try {
      await fs.unlink(absolutePath);
    } catch (error: any) {
      // If it doesn't exist, we can ignore or log
      this.logger.warn(`Failed to delete file ${key}: ${error.message}`);
    }
  }
}
