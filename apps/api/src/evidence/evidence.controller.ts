import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { createReadStream } from 'fs';
import { EvidenceService } from './evidence.service.js';
import { StorageService } from '../storage/storage.service.js';
import { CreateEvidenceDto, UpdateEvidenceDto } from './dto/evidence.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UserRole } from '@placecampus/shared-types';

@ApiTags('Evidence')
@Controller('evidence')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EvidenceController {
  constructor(
    private readonly evidenceService: EvidenceService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Create new evidence' })
  create(
    @CurrentUser() user: any,
    @Body() createEvidenceDto: CreateEvidenceDto,
  ) {
    return this.evidenceService.create(user.userId, createEvidenceDto);
  }

  @Get('me')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get all evidence for the authenticated student' })
  findAll(@CurrentUser() user: any) {
    return this.evidenceService.findAllForStudent(user.userId);
  }

  @Get(':id')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Get specific evidence by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.evidenceService.findOne(id, user.userId);
  }

  @Patch(':id')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Update specific evidence' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() updateEvidenceDto: UpdateEvidenceDto,
  ) {
    return this.evidenceService.update(id, user.userId, updateEvidenceDto);
  }

  @Delete(':id')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Delete specific evidence' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.evidenceService.delete(id, user.userId);
  }

  @Post(':id/document')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Upload a supporting document for evidence' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
      fileFilter: (req, file, cb) => {
        // Validate MIME type
        const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Invalid file type. Only PDF, JPG, and PNG are allowed.',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadDocument(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Verify ownership of the evidence item first before saving file
    await this.evidenceService.findOne(id, user.userId);

    // Save file via storage service
    const savedMeta = await this.storageService.saveFile(
      `evidence/${user.userId}`,
      file,
    );

    // Provide the public download url
    const publicUrl = `/api/v1/evidence/${id}/document/download`;

    // Attach to evidence
    return this.evidenceService.attachDocument(id, user.userId, {
      ...savedMeta,
      url: publicUrl,
    });
  }

  @Get(':id/document/download')
  @Roles(UserRole.STUDENT)
  @ApiOperation({ summary: 'Download the supporting document for evidence' })
  async downloadDocument(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const documentMeta = await this.evidenceService.getInternalDocumentMeta(
      id,
      user.userId,
    );

    if (!documentMeta.key) {
      throw new BadRequestException(
        'Document not fully uploaded or missing key',
      );
    }

    const absolutePath = await this.storageService.getFilePath(
      documentMeta.key,
    );

    const fileStream = createReadStream(absolutePath);

    res.set({
      'Content-Type': documentMeta.mimeType,
      'Content-Disposition': `inline; filename="${documentMeta.originalName}"`,
    });

    return new StreamableFile(fileStream);
  }
}
