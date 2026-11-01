import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VerificationRecord } from './schemas/verification-record.schema.js';
import { EvidenceService } from '../evidence/evidence.service.js';

@Injectable()
export class VerificationService {
  constructor(
    @InjectModel(VerificationRecord.name)
    private recordModel: Model<VerificationRecord>,
    private evidenceService: EvidenceService,
  ) {}

  async getLatestRecord(evidenceId: string, studentId: string) {
    // 1. Verify ownership first
    await this.evidenceService.findOne(evidenceId, studentId);

    // 2. Fetch latest verification record
    const record = await this.recordModel
      .findOne({ evidenceId, studentId })
      .sort({ attemptNumber: -1 })
      .exec();

    if (!record) {
      throw new NotFoundException(
        'No verification record found for this evidence',
      );
    }

    // Sanitize the record (don't leak AI API internal errors, full AI dumps, etc., unless necessary)
    const sanitized = record.toObject();
    delete (sanitized as any)._id;
    delete (sanitized as any).__v;
    delete (sanitized as any).aiResult; // Hide internal AI JSON from students
    delete (sanitized as any).errorInformation; // Hide raw errors

    return sanitized;
  }
}
