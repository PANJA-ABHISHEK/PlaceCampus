import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { UserRole } from '@placecampus/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';
import { ImportsService } from './imports.service.js';
import { ConfirmImportDto, DerivedReviewDto, ReasonDto, UploadImportDto } from './dto/imports.dto.js';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const actorOf = (user: any) => ({ userId: user.userId, role: user.role });

/** Bulk provisioning (Master Plan §8.9): Administrators only. */
@ApiTags('Admin: Imports')
@Controller('admin/imports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class ImportsController {
  constructor(private readonly imports: ImportsService) {}

  @Get('templates/:kind')
  @ApiOperation({ summary: 'Download the official import template' })
  async template(@Param('kind') kind: string, @Res() res: Response) {
    const k = kind.toUpperCase();
    if (k !== 'STUDENTS' && k !== 'FACULTY') throw new BadRequestException('Unknown template');
    const buf = await this.imports.template(k);
    res.set({ 'Content-Type': XLSX_MIME, 'Content-Disposition': `attachment; filename="placecampus-${k.toLowerCase()}-template.xlsx"` });
    res.send(buf);
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a workbook; validation runs in the background' })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  upload(@UploadedFile() file: any, @Body() dto: UploadImportDto, @CurrentUser() user: any) {
    return this.imports.upload(file, dto, actorOf(user));
  }

  @Get()
  @ApiOperation({ summary: 'Import history' })
  list() {
    return this.imports.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Batch details, preview summary and mapping status' })
  get(@Param('id', ParseObjectIdPipe) id: string) {
    return this.imports.get(id);
  }

  @Get(':id/rows')
  @ApiOperation({ summary: 'Row-level results, diffs and issues' })
  rows(
    @Param('id', ParseObjectIdPipe) id: string,
    @Query() q: { action?: string; issue?: string; search?: string; page?: number; limit?: number },
  ) {
    return this.imports.rows(id, q);
  }

  @Get(':id/report')
  @ApiOperation({ summary: 'Download the error report (.xlsx)' })
  async report(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: any, @Res() res: Response) {
    const buf = await this.imports.report(id, actorOf(user));
    res.set({ 'Content-Type': XLSX_MIME, 'Content-Disposition': `attachment; filename="import-${id}-report.xlsx"` });
    res.send(buf);
  }

  @Post(':id/revalidate')
  @ApiOperation({ summary: 'Re-run validation (e.g. after approving mappings)' })
  revalidate(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: any) {
    return this.imports.revalidate(id, actorOf(user));
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm and commit (requires Idempotency-Key)' })
  confirm(
    @Param('id', ParseObjectIdPipe) id: string,
    @Headers('idempotency-key') key: string | undefined,
    @Body() dto: ConfirmImportDto,
    @CurrentUser() user: any,
  ) {
    return this.imports.confirm(id, key, dto, actorOf(user));
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry failed rows of a failed or partial commit' })
  retry(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: any) {
    return this.imports.retryCommit(id, actorOf(user));
  }

  @Post(':id/cancel')
  cancel(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: any) {
    return this.imports.cancel(id, actorOf(user));
  }

  @Post(':id/revert')
  @ApiOperation({ summary: 'Revert a committed batch (never-activated accounts are deactivated)' })
  revert(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: ReasonDto, @CurrentUser() user: any) {
    return this.imports.revert(id, dto.reason, actorOf(user));
  }

  @Post(':id/purge-demo')
  @ApiOperation({ summary: 'Demo batches only: delete the never-activated accounts it created' })
  purge(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: ReasonDto, @CurrentUser() user: any) {
    return this.imports.purgeDemo(id, dto.reason, actorOf(user));
  }

  @Post(':id/derived')
  @ApiOperation({ summary: 'Approve or reject derived batch/semester values' })
  derived(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: DerivedReviewDto, @CurrentUser() user: any) {
    return this.imports.reviewDerived(id, dto.action, dto.reason, actorOf(user));
  }

  @Post(':id/emails/confirm')
  @ApiOperation({ summary: 'Mark the batch email addresses as verified (real data only)' })
  confirmEmails(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: ReasonDto, @CurrentUser() user: any) {
    return this.imports.confirmEmails(id, dto.reason, actorOf(user));
  }
}
