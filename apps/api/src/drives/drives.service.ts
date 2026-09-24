import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PlacementDrive } from './schemas/drive.schema.js';
import { CreateDriveDto } from './dto/create-drive.dto.js';
import { DriveStatus } from '@placecampus/shared-types';

@Injectable()
export class DrivesService {
  constructor(
    @InjectModel(PlacementDrive.name) private driveModel: Model<PlacementDrive>,
  ) {}

  async create(createDriveDto: CreateDriveDto, userId: string): Promise<PlacementDrive> {
    const newDrive = new this.driveModel({
      ...createDriveDto,
      createdBy: userId,
    });
    return newDrive.save();
  }

  async findAll(query: any = {}): Promise<{ drives: PlacementDrive[]; total: number }> {
    const filter: any = {};
    if (query.status) {
      filter.status = query.status;
    }
    
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    const [drives, total] = await Promise.all([
      this.driveModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.driveModel.countDocuments(filter).exec(),
    ]);

    return { drives, total };
  }

  async findOne(id: string): Promise<PlacementDrive> {
    const drive = await this.driveModel.findById(id).exec();
    if (!drive) {
      throw new NotFoundException(`Drive with ID ${id} not found`);
    }
    return drive;
  }

  async updateStatus(id: string, status: DriveStatus): Promise<PlacementDrive> {
    const drive = await this.driveModel.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).exec();
    
    if (!drive) {
      throw new NotFoundException(`Drive with ID ${id} not found`);
    }
    return drive;
  }

  async registerStudent(driveId: string, studentId: string): Promise<PlacementDrive> {
    const drive = await this.findOne(driveId);
    
    if (drive.status !== DriveStatus.PUBLISHED && drive.status !== DriveStatus.REGISTRATION_OPEN) {
      throw new BadRequestException('Registration is not open for this drive');
    }

    if (drive.registeredStudentIds.includes(studentId)) {
      throw new BadRequestException('Student already registered for this drive');
    }

    drive.registeredStudentIds.push(studentId);
    return drive.save();
  }
}
