import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EvidenceService } from './evidence.service.js';
import { CreateEvidenceDto, UpdateEvidenceDto } from './dto/evidence.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserRole, type UserDocument } from '../users/schemas/user.schema.js';
import { EvidenceStatus } from './schemas/evidence.schema.js';
import { FileUploadService } from '../common/services/file-upload.service.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

@Controller('evidence')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvidenceController {
  constructor(
    private readonly evidenceService: EvidenceService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Post()
  @Roles(UserRole.STUDENT)
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @CurrentUser() user: UserDocument,
    @Body() dto: CreateEvidenceDto,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }
    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Allowed: PDF, JPEG, PNG, WebP, DOC, DOCX',
      );
    }

    const uploadResult = await this.fileUploadService.upload(file);

    return this.evidenceService.create(String(user._id), dto, {
      url: uploadResult.url,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    });
  }

  @Get('my')
  @Roles(UserRole.STUDENT)
  getMyEvidence(
    @CurrentUser() user: UserDocument,
    @Query('status') status?: EvidenceStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.evidenceService.findByStudent(String(user._id), {
      status,
      page,
      limit,
    });
  }

  @Get('my/stats')
  @Roles(UserRole.STUDENT)
  getMyStats(@CurrentUser() user: UserDocument) {
    return this.evidenceService.getStats(String(user._id));
  }

  @Get(':id')
  @Roles(UserRole.STUDENT)
  getEvidence(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
  ) {
    return this.evidenceService.findByIdForStudent(id, String(user._id));
  }

  @Patch(':id')
  @Roles(UserRole.STUDENT)
  updateEvidence(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
    @Body() dto: UpdateEvidenceDto,
  ) {
    return this.evidenceService.update(id, String(user._id), dto);
  }

  @Delete(':id')
  @Roles(UserRole.STUDENT)
  deleteEvidence(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
  ) {
    return this.evidenceService.delete(id, String(user._id));
  }
}
