import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@placecampus/shared-types';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { UpdatePreparationItemStatusDto } from './dto/update-preparation-item-status.dto.js';
import { PreparationService } from './preparation.service.js';

@Controller('preparation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class PreparationController {
  constructor(private readonly preparationService: PreparationService) {}

  @Post('plans/drive/:driveId')
  createForDrive(@Param('driveId') driveId: string, @Req() req: any) {
    return this.preparationService.createForDrive(driveId, req.user.id);
  }

  @Get('plans/me')
  getMine(@Req() req: any) {
    return this.preparationService.getMine(req.user.id);
  }

  @Get('plans/:id')
  getOne(@Param('id') id: string, @Req() req: any) {
    return this.preparationService.getOwnedPlan(id, req.user.id);
  }

  @Patch('plans/:id/items/:itemId/status')
  updateItemStatus(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdatePreparationItemStatusDto,
    @Req() req: any,
  ) {
    return this.preparationService.updateItemStatus(
      id,
      itemId,
      req.user.id,
      dto.status,
    );
  }

  @Post('plans/:id/regenerate')
  regenerate(@Param('id') id: string, @Req() req: any) {
    return this.preparationService.regenerate(id, req.user.id);
  }
}
