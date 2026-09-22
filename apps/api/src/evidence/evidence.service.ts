import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Evidence,
  type EvidenceDocument,
  EvidenceStatus,
} from './schemas/evidence.schema.js';
import { CreateEvidenceDto, UpdateEvidenceDto } from './dto/evidence.dto.js';

@Injectable()
export class EvidenceService {
  private readonly logger = new Logger(EvidenceService.name);

  constructor(
    @InjectModel(Evidence.name)
    private readonly evidenceModel: Model<EvidenceDocument>,
  ) {}

  async create(
    studentId: string,
    dto: CreateEvidenceDto,
    file: { url: string; originalName: string; mimeType: string; size: number },
  ): Promise<Evidence> {
    // Check for duplicate
    const duplicate = await this.evidenceModel
      .findOne({
        studentId: new Types.ObjectId(studentId),
        title: dto.title,
        type: dto.type,
        status: { $nin: [EvidenceStatus.REJECTED] },
      })
      .exec();

    if (duplicate) {
      throw new BadRequestException(
        'Evidence with the same title and type already exists',
      );
    }

    const evidence = new this.evidenceModel({
      ...dto,
      studentId: new Types.ObjectId(studentId),
      fileUrl: file.url,
      originalFileName: file.originalName,
      mimeType: file.mimeType,
      fileSize: file.size,
      status: EvidenceStatus.UPLOADED,
    });

    const saved = await evidence.save();
    this.logger.log(
      `Evidence created: ${saved._id.toString()} by student ${studentId}`,
    );
    return saved;
  }

  async findByStudent(
    studentId: string,
    filters?: { status?: EvidenceStatus; page?: number; limit?: number },
  ): Promise<{ evidence: Evidence[]; total: number }> {
    const query: Record<string, unknown> = {
      studentId: new Types.ObjectId(studentId),
    };
    if (filters?.status) query['status'] = filters.status;

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [evidence, total] = await Promise.all([
      this.evidenceModel.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }).exec(),
      this.evidenceModel.countDocuments(query).exec(),
    ]);

    return { evidence, total };
  }

  async findById(id: string): Promise<Evidence> {
    const evidence = await this.evidenceModel.findById(id).exec();
    if (!evidence) {
      throw new NotFoundException('Evidence not found');
    }
    return evidence;
  }

  async findByIdForStudent(id: string, studentId: string): Promise<Evidence> {
    const evidence = await this.findById(id);
    if (evidence.studentId.toString() !== studentId) {
      throw new ForbiddenException('You do not have access to this evidence');
    }
    return evidence;
  }

  async update(
    id: string,
    studentId: string,
    dto: UpdateEvidenceDto,
  ): Promise<Evidence> {
    const evidence = await this.findByIdForStudent(id, studentId);
    if (
      evidence.status !== EvidenceStatus.UPLOADED &&
      evidence.status !== EvidenceStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Can only update evidence in UPLOADED or REJECTED status',
      );
    }

    const updated = await this.evidenceModel
      .findByIdAndUpdate(id, { $set: dto }, { new: true })
      .exec();
    return updated!;
  }

  async delete(id: string, studentId: string): Promise<void> {
    const evidence = await this.findByIdForStudent(id, studentId);
    if (
      evidence.status !== EvidenceStatus.UPLOADED &&
      evidence.status !== EvidenceStatus.REJECTED
    ) {
      throw new BadRequestException(
        'Can only delete evidence in UPLOADED or REJECTED status',
      );
    }
    await this.evidenceModel.findByIdAndDelete(id).exec();
  }

  async updateStatus(
    id: string,
    status: EvidenceStatus,
    extra?: {
      aiAnalysis?: Evidence['aiAnalysis'];
      verifiedBy?: string;
      rejectionReason?: string;
      reviewNotes?: string;
    },
  ): Promise<Evidence> {
    const updateData: Record<string, unknown> = { status };
    if (extra?.aiAnalysis) updateData['aiAnalysis'] = extra.aiAnalysis;
    if (extra?.verifiedBy) {
      updateData['verifiedBy'] = new Types.ObjectId(extra.verifiedBy);
      updateData['verifiedAt'] = new Date();
    }
    if (extra?.rejectionReason) updateData['rejectionReason'] = extra.rejectionReason;
    if (extra?.reviewNotes) updateData['reviewNotes'] = extra.reviewNotes;

    const updated = await this.evidenceModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .exec();
    if (!updated) {
      throw new NotFoundException('Evidence not found');
    }
    return updated;
  }

  async findPendingReview(filters?: {
    status?: EvidenceStatus;
    page?: number;
    limit?: number;
  }): Promise<{ evidence: Evidence[]; total: number }> {
    const query: Record<string, unknown> = {
      status: filters?.status ?? EvidenceStatus.NEEDS_REVIEW,
    };

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [evidence, total] = await Promise.all([
      this.evidenceModel
        .find(query)
        .populate('studentId', 'firstName lastName email')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: 1 })
        .exec(),
      this.evidenceModel.countDocuments(query).exec(),
    ]);

    return { evidence, total };
  }

  async getStats(studentId?: string): Promise<Record<string, number>> {
    const match: Record<string, unknown> = {};
    if (studentId) match['studentId'] = new Types.ObjectId(studentId);

    const stats = await this.evidenceModel.aggregate([
      { $match: match },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).exec();

    const result: Record<string, number> = {
      total: 0,
      uploaded: 0,
      processing: 0,
      verified: 0,
      rejected: 0,
      needsReview: 0,
    };

    for (const s of stats as Array<{ _id: string; count: number }>) {
      if (!s._id) continue;
      const key = s._id.toLowerCase().replace('_', '');
      result[key === 'needsreview' ? 'needsReview' : key] = s.count;
      result['total'] = (result['total'] ?? 0) + s.count;
    }

    return result;
  }
}
