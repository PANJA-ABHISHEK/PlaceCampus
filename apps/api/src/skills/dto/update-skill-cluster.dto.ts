import { PartialType } from '@nestjs/mapped-types';
import { CreateSkillClusterDto } from './create-skill-cluster.dto.js';

export class UpdateSkillClusterDto extends PartialType(CreateSkillClusterDto) {}
