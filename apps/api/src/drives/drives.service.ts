import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PlacementDrive,
  PlacementDriveDocument,
} from './schemas/placement-drive.schema.js';
import {
  CreatePlacementDriveDto,
  UpdatePlacementDriveDto,
} from './dto/placement-drive.dto.js';
import { DriveStatus } from '@placecampus/shared-types';

@Injectable()
export class DrivesService {
  constructor(
    @InjectModel(PlacementDrive.name)
    private readonly placementDriveModel: Model<PlacementDriveDocument>,
  ) {}

  async create(
    createDto: CreatePlacementDriveDto,
    userId: string,
  ): Promise<PlacementDriveDocument> {
    const drive = new this.placementDriveModel({
      ...createDto,
      createdBy: userId,
      status: DriveStatus.DRAFT,
      requirements: createDto.requirements || { skills: [] },
    });
    return drive.save();
  }

  async findAllForStudent(): Promise<PlacementDriveDocument[]> {
    return this.placementDriveModel
      .find({ status: DriveStatus.PUBLISHED })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findAllForPlacementOfficer(): Promise<PlacementDriveDocument[]> {
    return this.placementDriveModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<PlacementDriveDocument> {
    const drive = await this.placementDriveModel.findById(id).exec();
    if (!drive) {
      throw new NotFoundException('Placement drive not found');
    }
    return drive;
  }

  async findOnePublished(id: string): Promise<PlacementDriveDocument> {
    const drive = await this.findOne(id);
    if (drive.status !== DriveStatus.PUBLISHED) {
      throw new ForbiddenException('This drive is not currently published');
    }
    return drive;
  }

  async update(
    id: string,
    updateDto: UpdatePlacementDriveDto,
  ): Promise<PlacementDriveDocument> {
    const drive = await this.findOne(id);

    if (drive.status !== DriveStatus.DRAFT) {
      throw new ForbiddenException('Only draft drives can be fully edited');
    }

    const updated = await this.placementDriveModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Placement drive not found');
    }
    return updated;
  }

  async publish(id: string): Promise<PlacementDriveDocument> {
    const drive = await this.findOne(id);

    if (drive.status !== DriveStatus.DRAFT) {
      throw new BadRequestException(
        'Drive must be in DRAFT status to be published',
      );
    }

    // Validate critical fields
    if (!drive.companyName || !drive.roleTitle || !drive.description) {
      throw new BadRequestException(
        'Company Name, Role Title, and Description are required to publish',
      );
    }

    drive.status = DriveStatus.PUBLISHED;
    return drive.save();
  }

  async close(id: string): Promise<PlacementDriveDocument> {
    const drive = await this.findOne(id);

    if (drive.status !== DriveStatus.PUBLISHED) {
      throw new BadRequestException('Only published drives can be closed');
    }

    drive.status = DriveStatus.CLOSED;
    return drive.save();
  }
}
