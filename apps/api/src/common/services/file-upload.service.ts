import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export interface UploadResult {
  url: string;
  publicId: string;
}

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);
  private isConfigured = false;

  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>('cloudinary.cloudName');
    const apiKey = this.configService.get<string>('cloudinary.apiKey');
    const apiSecret = this.configService.get<string>('cloudinary.apiSecret');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      this.isConfigured = true;
      this.logger.log('Cloudinary configured successfully');
    } else {
      this.logger.warn(
        'Cloudinary not configured – file uploads will use local fallback',
      );
    }
  }

  async upload(file: any): Promise<UploadResult> {
    if (!this.isConfigured) {
      // Dev fallback: return a placeholder URL
      const devId = `dev_${Date.now()}_${file.originalname}`;
      this.logger.warn(`Using dev fallback for file upload: ${devId}`);
      return {
        url: `/uploads/${devId}`,
        publicId: devId,
      };
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'placecampus/evidence',
          resource_type: 'auto',
          allowed_formats: ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'doc', 'docx'],
        },
        (error, result) => {
          if (error) {
            this.logger.error(`Cloudinary upload failed: ${error.message}`);
            reject(error);
          } else if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            });
          }
        },
      );
      uploadStream.end(file.buffer);
    });
  }

  async delete(publicId: string): Promise<void> {
    if (!this.isConfigured) return;
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      this.logger.error(`Failed to delete file ${publicId}`, error);
    }
  }
}
