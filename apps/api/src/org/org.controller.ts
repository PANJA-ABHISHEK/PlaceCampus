import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@placecampus/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe.js';
import { OrgService, type MappingView } from './org.service.js';
import { CreateLookupDto, DecideMappingDto } from './dto/org.dto.js';

/** Institution lookups and source-value mappings: Administrators only. */
@ApiTags('Admin: Organisation')
@Controller('admin/org')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class OrgController {
  constructor(private readonly org: OrgService) {}

  @Get('lookups')
  @ApiOperation({ summary: 'Approved departments and programmes' })
  lookups(@Query('type') type?: 'DEPARTMENT' | 'PROGRAMME') {
    return this.org.listLookups(type);
  }

  @Post('lookups')
  @ApiOperation({ summary: 'Create an approved department or programme' })
  createLookup(@Body() dto: CreateLookupDto, @CurrentUser() user: any) {
    return this.org.createLookup(dto, { userId: user.userId, role: user.role });
  }

  @Get('mappings')
  @ApiOperation({ summary: 'School/programme source values and their mapping status' })
  mappings(@Query('type') type?: 'DEPARTMENT' | 'PROGRAMME'): Promise<MappingView[]> {
    return this.org.listMappings(type);
  }

  @Patch('mappings/:id')
  @ApiOperation({ summary: 'Approve, reject or reset a source-value mapping' })
  decide(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: DecideMappingDto, @CurrentUser() user: any) {
    return this.org.decideMapping(id, dto, { userId: user.userId, role: user.role });
  }
}
