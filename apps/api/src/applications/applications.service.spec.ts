import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationsService } from './applications.service.js';
import { getModelToken } from '@nestjs/mongoose';
import { PlacementApplication } from './schemas/application.schema.js';
import { DrivesService } from '../drives/drives.service.js';
import { EligibilityService } from '../eligibility/eligibility.service.js';
import { MatchingService } from '../matching/matching.service.js';
import { ReadinessService } from '../readiness/readiness.service.js';
import { ApplicationStatus, DriveStatus } from '@placecampus/shared-types';
import {
  ForbiddenException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { vi } from 'vitest';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('ApplicationsService', () => {
  let service: ApplicationsService;

  const mockAppModel = {
    findOne: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
  };

  const mockDrivesService = {
    findOnePublished: vi.fn(),
  };

  const mockEligibilityService = {
    calculateForStudent: vi.fn(),
  };

  const mockMatchingService = {
    calculateForStudent: vi.fn(),
  };

  const mockReadinessService = {
    getLatestSnapshot: vi.fn(),
  };
  const mockEventEmitter = { emit: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        {
          provide: getModelToken(PlacementApplication.name),
          useValue: mockAppModel,
        },
        {
          provide: DrivesService,
          useValue: mockDrivesService,
        },
        {
          provide: EligibilityService,
          useValue: mockEligibilityService,
        },
        {
          provide: MatchingService,
          useValue: mockMatchingService,
        },
        {
          provide: ReadinessService,
          useValue: mockReadinessService,
        },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<ApplicationsService>(ApplicationsService);
  });

  describe('applyToDrive', () => {
    it('1. Eligible student can apply & 5, 6, 7: Stores snapshots', async () => {
      mockDrivesService.findOnePublished.mockResolvedValue({
        status: DriveStatus.PUBLISHED,
        id: 'drive-1',
      });
      mockAppModel.findOne.mockResolvedValue(null);

      const eligSnapshot = { eligible: true, checks: [], calculatedAt: 'now' };
      const matchSnapshot = { requiredSkillCoverage: 100 };
      const readSnapshot = { overallScore: 80 };

      mockEligibilityService.calculateForStudent.mockResolvedValue(eligSnapshot);
      mockMatchingService.calculateForStudent.mockResolvedValue(matchSnapshot);
      mockReadinessService.getLatestSnapshot.mockResolvedValue(readSnapshot);

      mockAppModel.create.mockResolvedValue({
        _id: 'app-1',
        status: ApplicationStatus.APPLIED,
      });

      await service.applyToDrive('drive-1', 'student-1');

      expect(mockAppModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          driveId: 'drive-1',
          studentId: 'student-1',
          status: ApplicationStatus.APPLIED,
          eligibilitySnapshot: eligSnapshot,
          matchSnapshot: matchSnapshot,
          readinessSnapshot: readSnapshot,
        }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('application.created', expect.anything());
    });

    it('2. Ineligible student cannot apply', async () => {
      mockDrivesService.findOnePublished.mockResolvedValue({
        status: DriveStatus.PUBLISHED,
        id: 'drive-1',
      });
      mockAppModel.findOne.mockResolvedValue(null);
      mockEligibilityService.calculateForStudent.mockResolvedValue({
        eligible: false,
      }); // Fails here

      await expect(
        service.applyToDrive('drive-1', 'student-1'),
      ).rejects.toThrow(ForbiddenException);
      expect(mockAppModel.create).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('3. Duplicate application is rejected', async () => {
      mockDrivesService.findOnePublished.mockResolvedValue({
        status: DriveStatus.PUBLISHED,
        id: 'drive-1',
      });
      mockAppModel.findOne.mockResolvedValue({ _id: 'existing-app' }); // Conflict

      await expect(
        service.applyToDrive('drive-1', 'student-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('4. Closed drive rejects application', async () => {
      mockDrivesService.findOnePublished.mockResolvedValue({
        status: DriveStatus.CLOSED,
        id: 'drive-1',
      });

      await expect(
        service.applyToDrive('drive-1', 'student-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('review transitions', () => {
    let mockSave: any;
    beforeEach(() => {
      mockSave = vi.fn().mockResolvedValue(true);
    });

    it('11. Placement Officer can move APPLIED -> UNDER_REVIEW', async () => {
      const app = { status: ApplicationStatus.APPLIED, save: mockSave };
      mockAppModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(app),
      });

      await service.reviewApplication(
        'app-1',
        { status: 'UNDER_REVIEW' },
        'po-1',
      );
      expect(app.status).toBe(ApplicationStatus.UNDER_REVIEW);
      expect(mockSave).toHaveBeenCalled();
    });

    it('12. Placement Officer can move UNDER_REVIEW -> SHORTLISTED', async () => {
      const app = { status: ApplicationStatus.UNDER_REVIEW, save: mockSave };
      mockAppModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(app),
      });

      await service.reviewApplication(
        'app-1',
        { status: 'SHORTLISTED' },
        'po-1',
      );
      expect(app.status).toBe(ApplicationStatus.SHORTLISTED);
    });

    it('13. Placement Officer can move UNDER_REVIEW -> REJECTED', async () => {
      const app = { status: ApplicationStatus.UNDER_REVIEW, save: mockSave };
      mockAppModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(app),
      });

      await service.reviewApplication('app-1', { status: 'REJECTED' }, 'po-1');
      expect(app.status).toBe(ApplicationStatus.REJECTED);
    });

    it('14. Invalid status transition is rejected', async () => {
      const app = { status: ApplicationStatus.APPLIED, save: mockSave };
      mockAppModel.findById.mockReturnValue({
        exec: vi.fn().mockResolvedValue(app),
      });

      await expect(
        service.reviewApplication('app-1', { status: 'SHORTLISTED' }, 'po-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
