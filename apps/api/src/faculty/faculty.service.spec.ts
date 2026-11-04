import { Test, TestingModule } from '@nestjs/testing';
import { FacultyService } from './faculty.service.js';
import { getModelToken } from '@nestjs/mongoose';
import { Evidence } from '../evidence/schemas/evidence.schema.js';
import { VerificationRecord } from '../verification/schemas/verification-record.schema.js';
import { StorageService } from '../storage/storage.service.js';
import { EvidenceStatus } from '@placecampus/shared-types';
import { ReviewAction } from './dto/review-decision.dto.js';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { User } from '../users/schemas/user.schema.js';
import { StudentProfile } from '../students/schemas/student-profile.schema.js';
import { FacultyAssignment } from '../assignments/schemas/faculty-assignment.schema.js';
import { AssignmentsService } from '../assignments/assignments.service.js';
import { AuditService } from '../audit/audit.service.js';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('FacultyService', () => {
  let service: FacultyService;
  let mockEvidenceModel: any;
  let mockRecordModel: any;
  let mockEventEmitter: any;
  const reviewer = { userId: 'faculty123', role: 'faculty' };
  const lookup = () => ({
    find: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([]),
    }),
  });

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
        { provide: getModelToken(User.name), useValue: lookup() },
        { provide: getModelToken(StudentProfile.name), useValue: lookup() },
        { provide: getModelToken(FacultyAssignment.name), useValue: { exists: vi.fn() } },
        { provide: AssignmentsService, useValue: { assignReviewer: vi.fn() } },
        { provide: AuditService, useValue: { logAction: vi.fn() } },
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
        service.makeDecision('evidence123', reviewer, {
          action: ReviewAction.APPROVE,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if evidence is not in review state', async () => {
      mockEvidenceModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue({ status: EvidenceStatus.VERIFIED, reviewerId: 'faculty123' }),
      });

      await expect(
        service.makeDecision('evidence123', reviewer, {
          action: ReviewAction.APPROVE,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should approve evidence and update record correctly', async () => {
      const mockEvidence = {
        _id: 'evidence123',
        studentId: 'student1',
        reviewerId: 'faculty123',
        createdAt: new Date(),
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

      const result = await service.makeDecision('evidence123', reviewer, {
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
        studentId: 'student1',
        reviewerId: 'faculty123',
        createdAt: new Date(),
        status: EvidenceStatus.NEEDS_REVIEW,
        save: vi.fn(),
      };

      mockEvidenceModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(mockEvidence),
      });

      await expect(
        service.makeDecision('evidence123', reviewer, {
          action: ReviewAction.REJECT,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('assignment scope and review lock', () => {
    const item = (extra: Record<string, unknown> = {}) => ({
      _id: 'evidence123',
      status: EvidenceStatus.NEEDS_REVIEW,
      reviewerId: 'faculty123',
      save: vi.fn(),
      ...extra,
    });
    const found = (doc: unknown) =>
      mockEvidenceModel.findById.mockReturnValue({ exec: vi.fn().mockResolvedValue(doc) });

    it('refuses decisions from a faculty member the item is not routed to', async () => {
      found(item({ reviewerId: 'someone-else' }));
      await expect(
        service.makeDecision('evidence123', reviewer, { action: ReviewAction.APPROVE }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lets an administrator act on any item', async () => {
      found(item({ reviewerId: 'someone-else', status: EvidenceStatus.VERIFIED }));
      // Passes the scope check and fails only on the status rule.
      await expect(
        service.makeDecision('evidence123', { userId: 'admin1', role: 'admin' }, { action: ReviewAction.APPROVE }),
      ).rejects.toThrow(BadRequestException);
    });

    it('claims a 30-minute lock and renews it for the same reviewer', async () => {
      const doc: any = item();
      found(doc);
      const before = Date.now();
      const result = await service.claimReview('evidence123', reviewer);
      expect(doc.reviewClaimedBy).toBe('faculty123');
      const expires = doc.reviewLockExpiresAt.getTime();
      expect(expires - before).toBeGreaterThanOrEqual(30 * 60 * 1000 - 50);
      expect(expires - before).toBeLessThanOrEqual(30 * 60 * 1000 + 1000);
      expect(result.reviewState).toBe('CLAIMED');
      await expect(service.claimReview('evidence123', reviewer)).resolves.toBeTruthy();
    });

    it('blocks a claim while another holder has an active lock', async () => {
      found(item({ reviewClaimedBy: 'admin1', reviewLockExpiresAt: new Date(Date.now() + 60_000) }));
      await expect(service.claimReview('evidence123', reviewer)).rejects.toThrow(ConflictException);
    });

    it('releases only a lock the caller holds', async () => {
      const doc: any = item({ reviewClaimedBy: 'faculty123', reviewLockExpiresAt: new Date(Date.now() + 60_000) });
      found(doc);
      await service.releaseReview('evidence123', reviewer);
      expect(doc.reviewClaimedBy).toBeUndefined();
      expect(doc.save).toHaveBeenCalled();
    });

    it('lists only items routed to the reviewer, and overdue ones on request', async () => {
      await service.getPendingReviews(reviewer, { filter: 'overdue' });
      const filter = mockEvidenceModel.find.mock.calls.at(-1)[0];
      expect(filter.reviewerId).toBe('faculty123');
      expect(filter.status).toBe(EvidenceStatus.NEEDS_REVIEW);
      expect(filter.reviewDueAt.$lt).toBeInstanceOf(Date);

      await service.getPendingReviews({ userId: 'admin1', role: 'admin' });
      expect(mockEvidenceModel.find.mock.calls.at(-1)[0].reviewerId).toBeUndefined();
    });
  });
});
