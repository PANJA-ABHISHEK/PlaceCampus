import { Injectable, NotFoundException, BadRequestException, ConflictException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Application } from './schemas/application.schema.js';
import { CreateApplicationDto } from './dto/create-application.dto.js';
import { ApplicationStatus } from '@placecampus/shared-types';
import { EligibilityEngineService } from './eligibility-engine.service.js';
import { DrivesService } from '../drives/drives.service.js';
import { StudentsService } from '../students/students.service.js';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectModel(Application.name) private applicationModel: Model<Application>,
    private eligibilityEngine: EligibilityEngineService,
    @Inject(forwardRef(() => DrivesService)) private drivesService: DrivesService,
    private studentsService: StudentsService,
  ) {}

  async create(createApplicationDto: CreateApplicationDto, userId: string): Promise<Application> {
    // Check if application already exists
    const existing = await this.applicationModel.findOne({
      studentId: userId,
      driveId: createApplicationDto.driveId
    }).exec();

    if (existing) {
      throw new ConflictException('You have already applied to this drive');
    }

    // Check Eligibility
    const student = await this.studentsService.findByUserId(userId);
    const drive = await this.drivesService.findOne(createApplicationDto.driveId);

    const eligibilityResult = this.eligibilityEngine.checkEligibility(drive, student);

    if (!eligibilityResult.isEligible) {
      throw new BadRequestException(`You are not eligible for this drive. Reasons: ${eligibilityResult.reasons.join(', ')}`);
    }

    const application = new this.applicationModel({
      ...createApplicationDto,
      studentId: userId,
    });
    
    // Register student to drive implicitly
    await this.drivesService.registerStudent(drive._id as string, userId);

    return application.save();
  }

  async checkEligibility(driveId: string, userId: string) {
    const student = await this.studentsService.findByUserId(userId);
    const drive = await this.drivesService.findOne(driveId);
    return this.eligibilityEngine.checkEligibility(drive, student);
  }

  async findAll(query: any = {}): Promise<{ applications: Application[]; total: number }> {
    const filter: any = {};
    if (query.studentId) filter.studentId = query.studentId;
    if (query.driveId) filter.driveId = query.driveId;
    if (query.status) filter.status = query.status;

    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
      this.applicationModel.find(filter)
        .populate('driveId')
        .populate('studentId', 'firstName lastName email rollNumber branch')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.applicationModel.countDocuments(filter).exec(),
    ]);

    return { applications, total };
  }

  async findOne(id: string): Promise<Application> {
    const application = await this.applicationModel.findById(id)
      .populate('driveId')
      .populate('studentId', 'firstName lastName email rollNumber branch')
      .exec();
      
    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }
    return application;
  }

  async updateStatus(id: string, status: ApplicationStatus): Promise<Application> {
    const application = await this.applicationModel.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).exec();
    
    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }
    return application;
  }
}
