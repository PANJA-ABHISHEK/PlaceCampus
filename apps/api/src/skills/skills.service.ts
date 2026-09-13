import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Skill, SkillDocument } from './schemas/skill.schema.js';
import { SkillCluster, SkillClusterDocument } from './schemas/skill-cluster.schema.js';
import { CreateSkillDto } from './dto/create-skill.dto.js';
import { UpdateSkillDto } from './dto/update-skill.dto.js';
import { CreateSkillClusterDto } from './dto/create-skill-cluster.dto.js';
import { UpdateSkillClusterDto } from './dto/update-skill-cluster.dto.js';

@Injectable()
export class SkillsService {
  constructor(
    @InjectModel(Skill.name) private skillModel: Model<SkillDocument>,
    @InjectModel(SkillCluster.name) private skillClusterModel: Model<SkillClusterDocument>,
  ) {}

  // --- Skills ---

  async createSkill(createSkillDto: CreateSkillDto): Promise<Skill> {
    const createdSkill = new this.skillModel(createSkillDto);
    return createdSkill.save();
  }

  async findAllSkills(): Promise<Skill[]> {
    return this.skillModel.find().exec();
  }

  async findSkillById(id: string): Promise<Skill> {
    const skill = await this.skillModel.findById(id).exec();
    if (!skill) {
      throw new NotFoundException(`Skill with ID ${id} not found`);
    }
    return skill;
  }

  async updateSkill(id: string, updateSkillDto: UpdateSkillDto): Promise<Skill> {
    const updatedSkill = await this.skillModel
      .findByIdAndUpdate(id, updateSkillDto, { new: true })
      .exec();
    if (!updatedSkill) {
      throw new NotFoundException(`Skill with ID ${id} not found`);
    }
    return updatedSkill;
  }

  async removeSkill(id: string): Promise<Skill> {
    const deletedSkill = await this.skillModel.findByIdAndDelete(id).exec();
    if (!deletedSkill) {
      throw new NotFoundException(`Skill with ID ${id} not found`);
    }
    return deletedSkill;
  }

  // --- Skill Clusters ---

  async createSkillCluster(createClusterDto: CreateSkillClusterDto): Promise<SkillCluster> {
    const createdCluster = new this.skillClusterModel(createClusterDto);
    return createdCluster.save();
  }

  async findAllSkillClusters(): Promise<SkillCluster[]> {
    return this.skillClusterModel.find().exec();
  }

  async findSkillClusterById(id: string): Promise<SkillCluster> {
    const cluster = await this.skillClusterModel.findById(id).exec();
    if (!cluster) {
      throw new NotFoundException(`Skill Cluster with ID ${id} not found`);
    }
    return cluster;
  }

  async updateSkillCluster(id: string, updateClusterDto: UpdateSkillClusterDto): Promise<SkillCluster> {
    const updatedCluster = await this.skillClusterModel
      .findByIdAndUpdate(id, updateClusterDto, { new: true })
      .exec();
    if (!updatedCluster) {
      throw new NotFoundException(`Skill Cluster with ID ${id} not found`);
    }
    return updatedCluster;
  }

  async removeSkillCluster(id: string): Promise<SkillCluster> {
    const deletedCluster = await this.skillClusterModel.findByIdAndDelete(id).exec();
    if (!deletedCluster) {
      throw new NotFoundException(`Skill Cluster with ID ${id} not found`);
    }
    return deletedCluster;
  }

  // --- Search ---

  async searchSkills(query: string): Promise<Skill[]> {
    if (!query) {
      return this.findAllSkills();
    }
    // Using MongoDB Atlas Search ($search)
    return this.skillModel.aggregate([
      {
        $search: {
          index: 'skills_search_index',
          text: {
            query,
            path: ['name', 'synonyms', 'description'],
            fuzzy: {
              maxEdits: 1,
            },
          },
        },
      },
      {
        $limit: 20,
      },
    ]).exec();
  }
}
