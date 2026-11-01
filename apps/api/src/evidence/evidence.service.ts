import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { Evidence } from './schemas/evidence.schema.js';
import { CreateEvidenceDto, UpdateEvidenceDto } from './dto/evidence.dto.js';
import { EvidenceStatus } from '@placecampus/shared-types';

@Injectable()
export class EvidenceService {
  constructor(
    @InjectModel(Evidence.name) private evidenceModel: Model<Evidence>,
    @InjectQueue('verification') private verificationQueue: Queue,
  ) {}

  sanitize(evidence: any) {
    const doc = evidence.toObject ? evidence.toObject() : evidence;
    doc.id = doc._id.toString();
    delete doc._id;
    delete doc.__v;
    // Don't leak the storage internal key
    if (doc.document && doc.document.key) {
      delete doc.document.key;
    }
    return doc;
  }

  async findAllForStudent(studentId: string) {
    const items = await this.evidenceModel
      .find({ studentId })
      .sort({ createdAt: -1 })
      .exec();
    return items.map((i) => this.sanitize(i));
  }

  async findOne(id: string, studentId: string) {
    const evidence = await this.evidenceModel
      .findOne({ _id: id, studentId })
      .exec();
    if (!evidence) {
      throw new NotFoundException('Evidence not found');
    }
    return this.sanitize(evidence);
  }

  async create(studentId: string, dto: CreateEvidenceDto) {
    const created = new this.evidenceModel({
      ...dto,
      studentId,
      status: EvidenceStatus.UNVERIFIED,
    });
    const saved = await created.save();
    return this.sanitize(saved);
  }

  async update(id: string, studentId: string, dto: UpdateEvidenceDto) {
    const evidence = await this.evidenceModel
      .findOne({ _id: id, studentId })
      .exec();
    if (!evidence) {
      throw new NotFoundException('Evidence not found');
    }

    // Status enforcement rules
    if (
      evidence.status === EvidenceStatus.VERIFIED ||
      evidence.status === EvidenceStatus.PROCESSING
    ) {
      throw new ForbiddenException(
        `Cannot edit evidence that is currently ${evidence.status}`,
      );
    }

    // Apply updates
    Object.assign(evidence, dto);

    // If it was rejected or needs review, and they update it, push it back to UNVERIFIED for review again
    if (
      evidence.status === EvidenceStatus.REJECTED ||
      evidence.status === EvidenceStatus.RESUBMISSION_REQUESTED ||
      evidence.status === EvidenceStatus.NEEDS_REVIEW
    ) {
      evidence.status = EvidenceStatus.UNVERIFIED;
      evidence.rejectionReason = undefined;
    }

    const updated = await evidence.save();
    return this.sanitize(updated);
  }

  async delete(id: string, studentId: string) {
    const evidence = await this.evidenceModel
      .findOne({ _id: id, studentId })
      .exec();
    if (!evidence) {
      throw new NotFoundException('Evidence not found');
    }

    if (
      evidence.status === EvidenceStatus.VERIFIED ||
      evidence.status === EvidenceStatus.PROCESSING
    ) {
      throw new ForbiddenException(
        `Cannot delete evidence that is currently ${evidence.status}`,
      );
    }

    await this.evidenceModel.deleteOne({ _id: id }).exec();
    return { success: true };
  }

  // Handle document attachment
  async attachDocument(id: string, studentId: string, documentMeta: any) {
    const evidence = await this.evidenceModel
      .findOne({ _id: id, studentId })
      .exec();
    if (!evidence) {
      throw new NotFoundException('Evidence not found');
    }

    if (
      evidence.status === EvidenceStatus.VERIFIED ||
      evidence.status === EvidenceStatus.PROCESSING
    ) {
      throw new ForbiddenException(
        `Cannot attach documents to evidence that is currently ${evidence.status}`,
      );
    }

    evidence.document = documentMeta;
    evidence.status = EvidenceStatus.PROCESSING;
    evidence.rejectionReason = undefined;

    const updated = await evidence.save();

    // Trigger asynchronous verification
    await this.verificationQueue.add(
      'verify-evidence',
      {
        evidenceId: updated.id.toString(),
        studentId,
        documentKey: documentMeta.key,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
      },
    );

    return this.sanitize(updated);
  }

  // Allow controller to access internal document data for download
  async getInternalDocumentMeta(id: string, studentId: string) {
    const evidence = await this.evidenceModel
      .findOne({ _id: id, studentId })
      .exec();
    if (!evidence || !evidence.document) {
      throw new NotFoundException('Evidence document not found');
    }
    return evidence.document;
  }

  // Secure internal method for the verification worker
  async updateVerificationResult(
    id: string,
    studentId: string,
    status: EvidenceStatus,
    reason?: string,
  ) {
    const evidence = await this.evidenceModel
      .findOne({ _id: id, studentId })
      .exec();
    if (!evidence) {
      throw new NotFoundException('Evidence not found');
    }

    evidence.status = status;

    if (
      status === EvidenceStatus.REJECTED ||
      status === EvidenceStatus.NEEDS_REVIEW ||
      status === EvidenceStatus.RESUBMISSION_REQUESTED
    ) {
      evidence.rejectionReason = reason;
    } else {
      evidence.rejectionReason = undefined;
    }

    if (status === EvidenceStatus.VERIFIED) {
      evidence.verifiedAt = new Date().toISOString();
    }

    const updated = await evidence.save();
    return this.sanitize(updated);
  }
}
