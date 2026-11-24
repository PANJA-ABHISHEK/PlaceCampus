import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as fs from 'fs/promises';
import { createReadStream } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { Readable } from 'stream';
import { v2 as cloudinary } from 'cloudinary';

export interface SavedFileMeta {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  key: string;
}

const CLOUDINARY_KEY_PREFIX = 'cloudinary:';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  // Keep local storage as the development fallback and for legacy uploaded files.
  private readonly uploadDir = path.join(process.cwd(), '..', '..', 'uploads');
  // Cloudinary files are briefly downloaded here for OCR/PDF tooling that expects a path.
  private readonly cloudinaryTempDir = path.join(tmpdir(), 'placecampus-cloudinary');
  private readonly cloudinaryEnabled = Boolean(process.env.CLOUDINARY_URL);

  constructor() {
    if (this.cloudinaryEnabled) {
      cloudinary.config({ secure: true });
    }
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
   * Save a file to Cloudinary when configured, otherwise use the local fallback.
   * E.g. saveFile('evidence/student_id', file)
   */
  async saveFile(namespace: string, file: any): Promise<SavedFileMeta> {
    const fileId = randomUUID();
    const ext = path.extname(file.originalname).toLowerCase();
    const safeNamespace = namespace.replace(/\\/g, '/').replace(/^\/+|\.\.(?:\/|$)/g, '');
    const publicId = `${safeNamespace}/${fileId}${ext}`;

    if (this.cloudinaryEnabled) {
      try {
        const result = await this.uploadToCloudinary(publicId, file);
        return {
          id: fileId,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          key: `${CLOUDINARY_KEY_PREFIX}${result.public_id}`,
        };
      } catch {
        this.logger.error('Failed to save file to Cloudinary');
        throw new InternalServerErrorException('Failed to process uploaded file');
      }
    }

    try {
      const absolutePath = path.join(this.uploadDir, safeNamespace, `${fileId}${ext}`);
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
        key: path.posix.join(safeNamespace, `${fileId}${ext}`),
      };
    } catch (error: any) {
      this.logger.error(`Failed to save file: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to process uploaded file');
    }
  }

  private async uploadToCloudinary(publicId: string, file: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          type: 'authenticated',
          public_id: publicId,
          overwrite: false,
        },
        (error, result) => {
          if (error) reject(error);
          else if (!result) reject(new Error('Cloudinary returned no upload result'));
          else resolve(result);
        },
      );

      if (file.buffer) {
        Readable.from([file.buffer]).pipe(uploadStream);
      } else if (file.path) {
        createReadStream(file.path).pipe(uploadStream);
      } else {
        reject(new Error('Uploaded file has neither a buffer nor a temporary path'));
      }
    });
  }

  /** Read content from Cloudinary or the local store (including legacy files). */
  async getFileBuffer(key: string): Promise<Buffer> {
    if (!key.startsWith(CLOUDINARY_KEY_PREFIX)) {
      try {
        return await fs.readFile(path.join(this.uploadDir, key));
      } catch {
        throw new InternalServerErrorException('File not found in storage');
      }
    }

    try {
      const publicId = key.slice(CLOUDINARY_KEY_PREFIX.length);
      const format = path.extname(publicId).slice(1);
      const signedUrl = cloudinary.utils.private_download_url(publicId, format, {
        resource_type: 'raw',
        type: 'authenticated',
        expires_at: Math.floor(Date.now() / 1000) + 120,
      });
      const response = await fetch(signedUrl);
      if (!response.ok) throw new Error('Cloudinary download failed');
      return Buffer.from(await response.arrayBuffer());
    } catch {
      this.logger.error('Failed to retrieve a document from Cloudinary');
      throw new InternalServerErrorException('File not found in storage');
    }
  }

  /**
   * Retrieves a path for OCR tools. Cloudinary objects are downloaded to a
   * short-lived temp file; call releaseFilePath when processing is complete.
   */
  async getFilePath(key: string): Promise<string> {
    if (!key.startsWith(CLOUDINARY_KEY_PREFIX)) {
      const absolutePath = path.join(this.uploadDir, key);
      try {
        await fs.access(absolutePath);
        return absolutePath;
      } catch {
        throw new InternalServerErrorException('File not found in storage');
      }
    }

    const publicId = key.slice(CLOUDINARY_KEY_PREFIX.length);
    const temporaryPath = path.join(
      this.cloudinaryTempDir,
      `${randomUUID()}${path.extname(publicId)}`,
    );
    try {
      await fs.mkdir(this.cloudinaryTempDir, { recursive: true });
      await fs.writeFile(temporaryPath, await this.getFileBuffer(key), { flag: 'wx' });
      return temporaryPath;
    } catch {
      this.logger.error('Failed to prepare a Cloudinary document for processing');
      throw new InternalServerErrorException('File not found in storage');
    }
  }

  async releaseFilePath(filePath: string): Promise<void> {
    const tempRoot = `${path.resolve(this.cloudinaryTempDir)}${path.sep}`;
    if (!path.resolve(filePath).startsWith(tempRoot)) return;
    try {
      await fs.unlink(filePath);
    } catch {
      // Best-effort cleanup; temp files are not the source of truth.
    }
  }

  /** Delete a file from Cloudinary or local storage. */
  async deleteFile(key: string): Promise<void> {
    if (key.startsWith(CLOUDINARY_KEY_PREFIX)) {
      try {
        await cloudinary.uploader.destroy(key.slice(CLOUDINARY_KEY_PREFIX.length), {
          resource_type: 'raw',
          type: 'authenticated',
        });
      } catch {
        this.logger.warn('Failed to delete a document from Cloudinary');
      }
      return;
    }

    try {
      await fs.unlink(path.join(this.uploadDir, key));
    } catch {
      this.logger.warn('Failed to delete a local document from storage');
    }
  }
}
