import { Test, TestingModule } from '@nestjs/testing';
import { FacultyService } from './faculty.service.js';
import { getModelToken } from '@nestjs/mongoose';
import { Evidence } from '../evidence/schemas/evidence.schema.js';
import { VerificationRecord } from '../verification/schemas/verification-record.schema.js';
import { StorageService } from '../storage/storage.service.js';
import { EvidenceStatus } from '@placecampus/shared-types';
import { ReviewAction } from './dto/review-decision.dto.js';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('FacultyService', () => {
  let service: FacultyService;
  let mockEvidenceModel: any;
  let mockRecordModel: any;
  let mockEventEmitter: any;

  beforeEach(async () => {
    mockEvidenceModel = {
      find: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
      findById: vi.fn(),
    };

    mockRecordModel = {
      findOne: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockReturnThis(),
      exec: vi.fn(),
    };
    mockEventEmitter = { emit: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FacultyService,
        { provide: getModelToken(Evidence.name), useValue: mockEvidenceModel },
        {
          provide: getModelToken(VerificationRecord.name),
          useValue: mockRecordModel,
        },
        { provide: StorageService, useValue: {} },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<FacultyService>(FacultyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('makeDecision', () => {
    it('should throw if evidence not found', async () => {
      mockEvidenceModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(null),
      });

      await expect(
        service.makeDecision('evidence123', 'faculty123', {
          action: ReviewAction.APPROVE,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if evidence is not in review state', async () => {
      mockEvidenceModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue({ status: EvidenceStatus.VERIFIED }),
      });

      await expect(
        service.makeDecision('evidence123', 'faculty123', {
          action: ReviewAction.APPROVE,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should approve evidence and update record correctly', async () => {
      const mockEvidence = {
        _id: 'evidence123',
        status: EvidenceStatus.NEEDS_REVIEW,
        save: vi.fn(),
      };

      const mockRecord: any = {
        _id: 'record123',
        evidenceId: 'evidence123',
        attemptNumber: 1,
        finalDecision: EvidenceStatus.NEEDS_REVIEW,
        reasons: [],
        save: vi.fn(),
      };

      mockEvidenceModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockEvidence),
        lean: vi.fn().mockReturnThis(),
      });

      mockRecordModel.findOne.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(mockRecord),
        lean: vi.fn().mockReturnThis(),
      });

      const result = await service.makeDecision('evidence123', 'faculty123', {
        action: ReviewAction.APPROVE,
      });

      expect(mockEvidence.status).toBe(EvidenceStatus.VERIFIED);
      expect(mockEvidence.save).toHaveBeenCalled();

      expect(mockRecord.finalDecision).toBe(EvidenceStatus.VERIFIED);
      expect(mockRecord.reviewedBy).toBe('faculty123');
      expect(mockRecord.save).toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('evidence.decision', expect.objectContaining({ evidence: mockEvidence }));
    });

    it('should reject evidence and require reason', async () => {
      const mockEvidence = {
        _id: 'evidence123',
        status: EvidenceStatus.NEEDS_REVIEW,
        save: vi.fn(),
      };

      mockEvidenceModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockEvidence),
      });

      await expect(
        service.makeDecision('evidence123', 'faculty123', {
          action: ReviewAction.REJECT,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
